import {
	PartyWithMemberProfiles,
	QueueList,
	reservedIds,
} from '@handlers/queue';
import { EventHandler, Handler, embed, message } from '@matteopolak/framecord';
import { Game, GameState, PickedPlayer } from '@prisma/client';
import { iter } from '@util/iter';
import { playersToFields } from '@util/message';
import { gameConfig } from 'config';
import { prisma } from 'database';
import {
	CategoryChannel,
	ChannelType,
	Collection,
	DMChannel,
	Guild,
	GuildBasedChannel,
	NonThreadGuildBasedChannel,
	PermissionsBitField,
} from 'discord.js';
import { inPlaceSort } from 'fast-sort';

export type GameWithPlayers = Game & {
	players: PickedPlayer[];
};

function isCategoryChannel(
	channel?: GuildBasedChannel,
): channel is CategoryChannel {
	return channel?.type === ChannelType.GuildCategory;
}

const MAX_CHANNELS_PER_CATEGORY = 50;
const DEFAULT_TEXT_ALLOW_PERMISSIONS =
	PermissionsBitField.Flags.ViewChannel &
	PermissionsBitField.Flags.SendMessages &
	PermissionsBitField.Flags.ReadMessageHistory &
	PermissionsBitField.Flags.AddReactions;

export class GameManager extends Handler {
	protected categories: Collection<
		string,
		Collection<string, CategoryChannel>
	> = new Collection();
	protected number = 0;

	public async init() {
		const categories = await prisma.category.findMany();

		const invalid = iter(categories)
			.map(c =>
				this.client.guilds.cache.get(c.guildId)?.channels.cache.get(c.id),
			)
			.filter(isCategoryChannel)
			.tap(c =>
				this.categories.has(c.guildId)
					? this.categories.get(c.guildId)!.set(c.id, c)
					: this.categories.set(c.guildId, new Collection([[c.id, c]])),
			)
			.map(c => c.id)
			.toArray();

		if (invalid.length > 0) {
			await prisma.category.deleteMany({
				where: {
					id: {
						in: invalid,
					},
				},
			});
		}

		const number = await prisma.game.findFirst({
			orderBy: {
				id: 'desc',
			},
		});

		this.number = number?.id ?? 0;
	}

	public async getCategoryWithCapacity(guild: Guild, needed: number) {
		const categories =
			this.categories.get(guild.id) ??
			this.categories.set(guild.id, new Collection()).get(guild.id)!;

		const category = categories.find(
			c => c.children.cache.size <= MAX_CHANNELS_PER_CATEGORY - needed,
		);

		if (category) return category;

		const created = await guild.channels.create({
			name: 'Games',
			type: ChannelType.GuildCategory,
		});

		categories.set(created.id, created);

		await prisma.category.create({
			data: {
				id: created.id,
				guildId: created.guildId,
			},
		});

		return created;
	}

	/**
	 * Assigns captains and all parties to a team. Individual players will be assigned if team picking is disabled.
	 *
	 * @param queue
	 * @param parties *Will* be mutated, do not expect to be able to re-use this array or any of its elements
	 */
	public createTeams(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
	): {
		captains: string[];
		remaining: string[];
		players: Omit<PickedPlayer, 'gameId'>[];
	} {
		const config = gameConfig[queue.mode];
		const captains: string[] = [];

		// Sort parties by member count, then by average rating if they're equal
		inPlaceSort(parties).desc([
			p => p.members.length,
			p =>
				p.members.reduce((a, b) => a + (b.profiles[0]?.rating ?? 0), 0) /
				p.members.length,
		]);

		// This must work as parties cannot be larger than the size of a team
		const teams = iter(parties)
			.take(config.teams)
			.tap(t => captains.push(t.members[0].id))
			.toArray();

		const [groups, individuals] = iter(parties)
			.skip(config.teams)
			.partition(p => p.members.length > 1);

		iter(groups).forEach(p =>
			teams
				.find(t => t.members.length + p.members.length <= config.playersPerTeam)
				?.members.push(...p.members),
		);

		// Sort team members by rating
		for (const team of teams) {
			inPlaceSort(team.members).desc(m => m.profiles[0]?.rating ?? 0);
		}

		if (config.teamPickingEnabled) {
			return {
				remaining: individuals.map(i => i.members[0].id),
				players: teams.flatMap((t, tx) =>
					t.members.map(m => ({
						userId: m.id,
						team: tx,
					})),
				),
				captains,
			};
		}

		iter(individuals).forEach(p =>
			teams
				.find(t => t.members.length + p.members.length <= config.playersPerTeam)
				?.members.push(...p.members),
		);

		return {
			remaining: [],
			players: teams.flatMap((t, tx) =>
				t.members.map(m => ({
					userId: m.id,
					team: tx,
				})),
			),
			captains,
		};
	}

	public reservePlayers(players: Iterable<string>) {
		for (const player of players) {
			reservedIds.add(player);
		}
	}

	public releasePlayers(players: Iterable<string>) {
		for (const player of players) {
			reservedIds.delete(player);
		}
	}

	public reserveParties(parties: PartyWithMemberProfiles[]) {
		return this.reservePlayers(
			iter(parties)
				.flatMap(p => p.members)
				.map(m => m.id),
		);
	}

	public releaseParties(parties: PartyWithMemberProfiles[]) {
		return this.releasePlayers(
			iter(parties)
				.flatMap(p => p.members)
				.map(m => m.id),
		);
	}

	public async createGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
		guild: Guild,
	) {
		// Lock the players

		const category = await this.getCategoryWithCapacity(
			guild,
			gameConfig[queue.mode].teams + 1,
		);

		const gameId = this.number++;
		const data = this.createTeams(queue, parties);

		const text = await category.children.create({
			name: `Game #${gameId}`,
			permissionOverwrites: iter(parties)
				.flatMap(p =>
					p.members.map(m => ({
						id: m.id,
						allow: DEFAULT_TEXT_ALLOW_PERMISSIONS,
					})),
				)
				.toArray(),
		});

		const state =
			data.remaining.length === 0
				? GameState.BanningMaps
				: GameState.PickingTeams;

		const game = await prisma.game.create({
			data: {
				id: gameId,
				state,
				mode: queue.mode,
				textChannelId: text.id,
				remainingIds: {
					set: data.remaining,
				},
				captains: {
					set: data.captains,
				},
				players: {
					createMany: {
						data: data.players,
					},
				},
			},
			include: {
				players: true,
			},
		});

		if (state === GameState.PickingTeams) {
			const teamIndex = GameManager.calculateNextPick(-1, game);

			await message(
				text,
				embed({
					title: 'Team Picking',
					description: `@<${data.captains[teamIndex]}>, pick a player with \`/pick <user>\`.`,
					fields: playersToFields(data.players),
				}),
			);
		}
	}

	public static calculateNextPick(lastIndex: number, game: GameWithPlayers) {
		const { nextIndex } = game.players.reduce(
			(a, b) => {
				if (a.map[b.team]) {
					++a.map[b.team];
				} else {
					a.map[b.team] = 1;
				}

				if (a.map[b.team] === gameConfig[game.mode].playersPerTeam) return a;

				if (
					a.map[b.team] < a.count ||
					(a.map[b.team] === a.count && a.nextIndex === lastIndex)
				) {
					a.nextIndex = b.team;
					a.count = a.map[b.team];
				}

				return a;
			},
			{
				nextIndex: -1,
				count: Infinity,
				map: {} as Record<string, number>,
			},
		);

		return nextIndex;
	}

	public async initializeGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
	) {
		const guild = this.client.guilds.cache.get(queue.guildId);
		if (!guild) return;

		await this.createGame(queue, parties, guild);

		// pick teams
		// create team vcs
		// create map banning for team captains
		// create scoring command, add option to use built-in OCR configured for Hypixel Bedwars
	}

	@EventHandler()
	public async channelDelete(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.type !== ChannelType.GuildCategory) return;

		this.categories.delete(channel.id);
	}
}

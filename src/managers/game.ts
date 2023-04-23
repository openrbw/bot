import { embed, EventHandler, Handler, message } from '@matteopolak/framecord';
import { Game, GameUser, Mode, User } from '@prisma/client';
import { prisma } from 'database';
import {
	CategoryChannel,
	ChannelType,
	Collection,
	DMChannel,
	Guild,
	GuildBasedChannel,
	GuildTextBasedChannel,
	NonThreadGuildBasedChannel,
	OverwriteResolvable,
	OverwriteType,
	PermissionsBitField,
	VoiceBasedChannel,
} from 'discord.js';
import { inPlaceSort } from 'fast-sort';

import { Connector } from '$/connectors/base';
import {
	modeAndGuildToQueueData,
	PartyWithMemberProfiles,
	QueueList,
	reservedIds,
} from '$/handlers/queue';
import { member } from '$/util/forge';
import { iter } from '$/util/iter';

export const enum GameState {
	PRE_GAME,
	ACTIVE,
	SCORING,
	POST_GAME,
}

export const connectors = new Map<string, Connector>();

export function addConnector(connector: Connector) {
	connectors.set(connector.name, connector);
}

export type GameWithModeNameAndPlayersWithProfiles = Game & {
	users: GameUser[];
	mode: Mode;
};

export type GameWithModeNameAndPlayers = Game & {
	users: GameUser[];
	mode: Mode;
};

export type GameUserWithDiscordId = GameUser & {
	user: Pick<User, 'discordId'>;
};

export type GameWithPlayersWithDiscordIds = Game & {
	users: GameUserWithDiscordId[];
};

export type GameWithModeNameAndPlayersWithDiscordIds = Game & {
	users: GameUserWithDiscordId[];
	mode: Mode;
};

export type GameWithPlayers = Game & {
	users: GameUser[];
};

function isCategoryChannel(
	channel?: GuildBasedChannel
): channel is CategoryChannel {
	return channel?.type === ChannelType.GuildCategory;
}

const MAX_CHANNELS_PER_CATEGORY = 50;

const DEFAULT_VOICE_ALLOW_PERMISSIONS =
	PermissionsBitField.Flags.Connect &
	PermissionsBitField.Flags.UseVAD &
	PermissionsBitField.Flags.Speak &
	PermissionsBitField.Flags.ViewChannel;

const DEFAULT_TEXT_ALLOW_PERMISSIONS =
	PermissionsBitField.Flags.ViewChannel &
	PermissionsBitField.Flags.SendMessages &
	PermissionsBitField.Flags.ReadMessageHistory &
	PermissionsBitField.Flags.AddReactions;

const DEFAULT_TEXT_DENY_PERMISSIONS =
	PermissionsBitField.Flags.ViewChannel;

export class GameManager extends Handler {
	public static activeGames = 0;

	protected static categories: Collection<
		string,
		Collection<string, CategoryChannel>
	> = new Collection();
	protected static number = 0;

	@EventHandler()
	public async ready() {
		const categories = await prisma.category.findMany();

		const invalid = iter(categories)
			.map(c =>
				this.client.guilds.cache.get(c.guildId)?.channels.cache.get(c.id)
			)
			.filter(isCategoryChannel)
			.tap(c =>
				GameManager.categories.has(c.guildId)
					? GameManager.categories.get(c.guildId)!.set(c.id, c)
					: GameManager.categories.set(c.guildId, new Collection([[c.id, c]]))
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

		const number: { nextval: bigint }[] = await prisma.$queryRaw`
			SELECT nextval(format('%I', 'Game_id_seq'));
		`;

		GameManager.number = Number(number[0].nextval);
	}

	/**
	 *
	 * @param guild The guild in which the category should reside
	 * @param needed The number of channels that must be reserved
	 * @returns
	 */
	private static async getCategoryWithCapacity(guild: Guild, needed: number) {
		const categories =
			this.categories.get(guild.id) ??
			this.categories.set(guild.id, new Collection()).get(guild.id)!;

		const category = categories.find(
			c => c.children.cache.size <= MAX_CHANNELS_PER_CATEGORY - needed
		);

		if (category) return category;

		const created = await guild.channels.create({
			name: 'Games',
			type: ChannelType.GuildCategory,
			permissionOverwrites: [
				{
					id: guild.roles.everyone.id,
					type: OverwriteType.Role,
					deny: DEFAULT_TEXT_DENY_PERMISSIONS,
				},
			],
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
	private static createTeams(
		queue: QueueList,
		parties: PartyWithMemberProfiles[]
	): Omit<GameUserWithDiscordId, 'gameId' | 'id'>[] {
		const config = queue.mode;

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
			.toArray();

		const [groups, individuals] = iter(parties)
			.skip(config.teams)
			.partition(p => p.members.length > 1);

		iter(groups).forEach(p =>
			teams
				.find(t => t.members.length + p.members.length <= config.playersPerTeam)
				?.members.push(...p.members)
		);

		// Add every player to a team
		iter(individuals).forEach(p =>
			teams
				.find(t => t.members.length + p.members.length <= config.playersPerTeam)
				?.members.push(...p.members)
		);

		// Sort team members by rating
		for (const team of teams) {
			inPlaceSort(team.members).desc(m => m.profiles[0]?.rating ?? 0);
		}

		return teams.flatMap((t, tx) =>
			t.members.map((m, i) => ({
				userId: m.id,
				user: {
					discordId: m.discordId,
				},
				team: tx,
				index: i,
			}))
		);
	}

	/** Adds all of the players to the reversed list */
	private static reservePlayers(players: Iterable<string>) {
		for (const player of players) {
			reservedIds.add(player);
		}
	}

	/** Removes all of the players from the reversed list */
	private static releasePlayers(players: Iterable<string>) {
		for (const player of players) {
			reservedIds.delete(player);
		}
	}

	/** Adds all party members to the reserved list */
	private static reserveParties(parties: PartyWithMemberProfiles[]) {
		return this.reservePlayers(
			iter(parties)
				.flatMap(p => p.members)
				.map(m => m.discordId)
		);
	}

	/** Removes all party members from the reserved list */
	private static releaseParties(parties: PartyWithMemberProfiles[]) {
		return this.releasePlayers(
			iter(parties)
				.flatMap(p => p.members)
				.map(m => m.discordId)
		);
	}

	/** Moves the player to the specified voice channel */
	private static async movePlayer(userId: string, channel: VoiceBasedChannel) {
		try {
			await member(userId, channel.guild).voice.setChannel(channel);

			return true;
		} catch {
			return false;
		}
	}

	/** Creates the text channel and `teams` voice channels */
	private static async createGameChannels(
		queue: QueueList,
		guild: Guild,
		parties: PartyWithMemberProfiles[],
		gameId: number
	) {
		const teamCount = queue.mode.teams;
		const category = await this.getCategoryWithCapacity(guild, teamCount + 1);

		const textPermissionOverwrites: OverwriteResolvable[] = iter(parties)
			.flatMap(p =>
				p.members.map(m => ({
					id: m.discordId,
					allow: DEFAULT_TEXT_ALLOW_PERMISSIONS,
				}))
			)
			.toArray();

		const text = await category.children.create({
			name: `Game #${gameId}`,
			permissionOverwrites: textPermissionOverwrites,
		});

		const permissions: OverwriteResolvable[][] = Array.from(
			{ length: teamCount },
			() => []
		);

		for (const [index, party] of parties.entries()) {
			if (index < teamCount) {
				const voicePermissionOverwrites: OverwriteResolvable[] = iter(party.members)
					.map(m => ({
						id: m.discordId,
						type: OverwriteType.Member,
						allow: DEFAULT_VOICE_ALLOW_PERMISSIONS,
					}))
					.toArray();

				permissions[index] = voicePermissionOverwrites;
			} else {
				permissions[0].push(
					...iter(party.members).map(m => ({
						id: m.discordId,
						type: OverwriteType.Member,
						allow: DEFAULT_VOICE_ALLOW_PERMISSIONS,
					}))
				);
			}
		}

		const voice = await Promise.all(
			permissions.map((p, i) =>
				category.children.create({
					name: `Game #${gameId}, Team #${i + 1}`,
					type: ChannelType.GuildVoice,
					permissionOverwrites: p,
				})
			)
		);

		return {
			text,
			voice,
		};
	}

	/** Creates a new game */
	private static async createGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
		guild: Guild
	) {
		// Lock the players
		this.reserveParties(parties);

		const gameId = this.number++;
		const players = this.createTeams(queue, parties);

		const { text, voice } = await this.createGameChannels(
			queue,
			guild,
			parties,
			gameId
		);

		await Promise.all(
			players
				.map(p => this.movePlayer(p.user.discordId, voice[p.team]))
		);

		return await prisma.game.create({
			data: {
				id: gameId,
				state: GameState.ACTIVE,
				modeId: queue.modeId,
				textChannelId: text.id,
				voiceChannelIds: {
					set: voice.map(v => v.id),
				},
				guildId: guild.id,
				users: {
					createMany: {
						data: players.map(p => ({
							userId: p.userId,
							team: p.team,
							index: p.index,
						})),
					},
				},
			},
			include: {
				users: true,
			},
		});
	}

	/** Closes the game */
	public static async close(
		game: GameWithModeNameAndPlayersWithDiscordIds,
		guild: Guild,
		channel: GuildTextBasedChannel,
		reason: string
	) {
		// Unlock the players after they have been moved
		this.releasePlayers(iter(game.users).map(p => p.user.discordId));

		message(
			channel,
			embed({
				title: 'Game Finished',
				description: `Want to play again?\n${modeAndGuildToQueueData
					.get(`${guild.id}.${game.mode.id}`)
					?.map(q => `<#${q.channelId}>`)
					.join('\n') || 'No queue channels found :('
					}`,
				fields: [
					{
						name: 'Reason',
						value: reason,
					},
				],
			})
		);

		return setTimeout(async () => {
			await guild.channels
				.delete(game.textChannelId, `Closing game #${game.id}`)
				.catch(() => null);

			for (const voiceId of game.voiceChannelIds) {
				await guild.channels
					.delete(voiceId, `Closing game #${game.id}`)
					.catch(() => null);
			}

			--this.activeGames;
		}, 5_000);
	}

	/** Initializes a new game */
	public static async initializeGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
		guild: Guild
	) {
		++this.activeGames;

		const game = await this.createGame(queue, parties, guild);

		if (queue.mode.connector !== null) {
			const connector = connectors.get(queue.mode.connector);

			if (connector) {
				await connector.onGameStart(game);
			}
		}
	}

	@EventHandler()
	public async channelDelete(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.type !== ChannelType.GuildCategory) return;

		GameManager.categories.get(channel.guildId)?.delete(channel.id);
	}
}

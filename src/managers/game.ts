import { PartyWithMemberProfiles, QueueList } from '@handlers/queue';
import { EventHandler, Handler } from '@matteopolak/framecord';
import { iter } from '@util/iter';
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

function isCategoryChannel(
	channel?: GuildBasedChannel,
): channel is CategoryChannel {
	return channel?.type === ChannelType.GuildCategory;
}

const MAX_CHANNELS_PER_CATEGORY = 50;
const DEFAULT_TEXT_ALLOW_PERMISSIONS = new PermissionsBitField([
	'ViewChannel',
	'SendMessages',
	'ReadMessageHistory',
	'AddReactions',
]);

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

	public async createGameChannels() {}

	public async assignTeams(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
	) {}

	public async createGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
		guild: Guild,
	) {
		const remainingIds = <string[]>[];

		const category = await this.getCategoryWithCapacity(
			guild,
			gameConfig[queue.mode].teams + 1,
		);

		const text = await category.children.create({
			name: `Game #${++this.number}`,
			permissionOverwrites: iter(parties)
				.flatMap(p =>
					p.members.map(m => ({
						id: m.id,
						allow: DEFAULT_TEXT_ALLOW_PERMISSIONS,
					})),
				)
				.extract(remainingIds, m => m.id)
				.toArray(),
		});

		const game = await prisma.game.create({
			data: {
				id: this.number,
				textChannelId: text.id,
				remainingIds,
			},
		});
	}

	public async initializeGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
	) {
		const guild = this.client.guilds.cache.get(queue.guildId);
		if (!guild) return;

		const remainingIds = [];

		if (gameConfig[queue.mode].teamPickingEnabled) {
		}

		// create game channels
		// create team picking, or create teams automatically if disabled
		// put teams into their vcs
		// create map banning for team captains
		// create scoring command, add option to use built-in OCR configured for Hypixel Bedwars
	}

	@EventHandler()
	public async channelDelete(channel: DMChannel | NonThreadGuildBasedChannel) {
		if (channel.type !== ChannelType.GuildCategory) return;

		this.categories.delete(channel.id);
	}
}

import {
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { APIEmbed } from 'discord.js';

export default class FactionListCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Lists the players in your faction.';
	}

	public async run(source: CommandSource) {
		const faction = await prisma.faction.findFirst({
			where: {
				members: {
					some: {
						discordId: source.user.id,
					},
				},
			},
			select: {
				name: true,
				leaderId: true,
				leader: {
					select: {
						discordId: true,
					},
				},
				members: {
					select: {
						id: true,
						discordId: true,
					},
				},
			},
		});

		if (faction === null) throw 'You are not in a faction.';

		const leader =
			faction.leader.discordId === source.user.id
				? source.user
				: await this.client.users
					.fetch(faction.leader.discordId, { cache: false })
					.catch(() => null);

		const data: APIEmbed = {
			fields: [
				{
					name: `Members (${faction.members.length})`,
					value: faction.members.map(m => `<@${m.id}>`).join('\n'),
				},
			],
		};

		if (leader === null) {
			data.description = faction.name ?? `<@${faction.leaderId}>'s Faction`;
		} else {
			data.author = {
				name: faction.name ?? `${leader.tag}'s Faction`,
				icon_url: leader.displayAvatarURL(),
			};
		}

		return embed(data);
	}
}

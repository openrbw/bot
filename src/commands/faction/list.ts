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
						id: source.user.id,
					},
				},
			},
			include: {
				members: true,
			},
		});

		if (faction === null) throw 'You are not in a faction.';

		const leader =
			faction.leaderId === source.user.id
				? source.user
				: await this.client.users
						.fetch(faction.leaderId, { cache: false })
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
			data.description = `<@${faction.leaderId}>'s Faction`;
		} else {
			data.author = {
				name: `${leader.tag}'s Faction`,
				icon_url: leader.displayAvatarURL(),
			};
		}

		return embed(data);
	}
}

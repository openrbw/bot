import {
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { APIEmbed } from 'discord.js';

export default class PartyListCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Lists the players in your party.';
	}

	public async run(source: CommandSource) {
		const party = await prisma.party.findFirst({
			where: {
				members: {
					some: {
						discordId: source.user.id,
					},
				},
			},
			select: {
				leader: {
					select: {
						discordId: true,
					},
				},
				members: {
					select: {
						discordId: true,
					},
				},
			},
		});

		if (party === null) throw 'You are not in a party.';

		const leader =
			party.leader.discordId === source.user.id
				? source.user
				: await this.client.users
					.fetch(party.leader.discordId, { cache: false })
					.catch(() => null);

		const data: APIEmbed = {
			fields: [
				{
					name: `Members (${party.members.length})`,
					value: party.members.map(m => `<@${m.discordId}>`).join('\n'),
				},
			],
		};

		if (leader === null) {
			data.description = `<@${party.leader.discordId}>'s Party`;
		} else {
			data.author = {
				name: `${leader.tag}'s Party`,
				icon_url: leader.displayAvatarURL(),
			};
		}

		return embed(data);
	}
}

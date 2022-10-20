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
	}

	public async run(source: CommandSource) {
		const party = await prisma.party.findFirst({
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

		if (party === null) throw 'You are not in a party.';

		const leader =
			party.leaderId === source.user.id
				? source.user
				: await this.client.users
						.fetch(party.leaderId, { cache: false })
						.catch(() => null);

		const data: APIEmbed = {
			fields: [
				{
					name: `Members (${party.members.length})`,
					value: party.members.map(m => `<@${m.id}>`).join('\n'),
				},
			],
		};

		if (leader === null) {
			data.description = `<@${party.leaderId}>'s Party`;
		} else {
			data.author = {
				name: `${leader.tag}'s Party`,
				icon_url: leader.displayAvatarURL(),
			};
		}

		return embed(data);
	}
}

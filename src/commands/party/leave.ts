import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class PartyLeaveCommand extends Command {
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
		if (party.leaderId === source.user.id)
			throw 'You cannot leave a party you are a leader of. Use `/party disband` or `/party transfer <user>` instead.';

		await prisma.user.update({
			where: {
				id: source.user.id,
			},
			data: {
				partyId: source.user.id,
			},
		});

		return `You have left <@${party.leaderId}>'s party of **${party.members.length} players**.`;
	}
}

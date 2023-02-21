import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class PartyLeaveCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Leaves your current party.';
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
				leaderId: true,
				members: {
					select: {
						id: true,
					},
				},
			},
		});

		if (party === null) throw 'You are not in a party.';
		if (party.leader.discordId === source.user.id)
			throw 'You cannot leave a party you are a leader of. Use `/party disband` or `/party transfer <user>` instead.';

		await prisma.user.update({
			where: {
				discordId: source.user.id,
			},
			data: {
				party: {
					disconnect: true,
				},
			},
		});

		return `You have left <@${party.leaderId}>'s party of **${party.members.length} players**.`;
	}
}

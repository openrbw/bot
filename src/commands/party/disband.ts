import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class PartyDisbandCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Disbands your party.';
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
				id: true,
				members: {
					select: {
						id: true,
					},
				},
				leader: {
					select: {
						discordId: true,
					},
				},
			},
		});

		if (party === null) throw 'You are not in a party.';
		if (party.leader.discordId !== source.user.id)
			throw `Only the party leader, <@${party.leader.discordId}>, can disband the party.`;

		await prisma.party.delete({
			where: {
				id: party.id,
			},
		});

		return `You have disbanded your party of **${party.members.length} player${
			party.members.length === 1 ? '' : 's'
		}**.`;
	}
}

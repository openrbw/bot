import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class FactionDisbandCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Disbands your faction.';
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
		if (faction.leaderId !== source.user.id)
			throw `Only the faction leader, <@${faction.leaderId}>, can disband the faction.`;

		await prisma.faction.delete({
			where: {
				leaderId: source.user.id,
			},
		});

		return `You have disbanded your faction of **${
			faction.members.length
		} player${faction.members.length === 1 ? '' : 's'}**.`;
	}
}

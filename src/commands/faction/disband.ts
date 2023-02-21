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
						discordId: source.user.id,
					},
				},
			},
			select: {
				id: true,
				leader: {
					select: {
						discordId: true,
					},
				},
				members: {
					select: {
						id: true,
					},
				},
			},
		});

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leader.discordId !== source.user.id)
			throw `Only the faction leader, <@${faction.leader.discordId}>, can disband the faction.`;

		await prisma.faction.delete({
			where: {
				id: faction.id,
			},
		});

		return `You have disbanded your faction of **${
			faction.members.length
		} player${faction.members.length === 1 ? '' : 's'}**.`;
	}
}

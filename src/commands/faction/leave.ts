import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class FactionLeaveCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Leaves your current faction.';
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
		if (faction.leaderId === source.user.id)
			throw 'You cannot leave a faction you are a leader of. Use `/faction disband` or `/faction transfer <user>` instead.';

		await prisma.user.update({
			where: {
				id: source.user.id,
			},
			data: {
				faction: {
					create: {
						leaderId: source.user.id,
					},
				},
			},
		});

		return `You have left <@${faction.leaderId}>'s faction of **${faction.members.length} players**.`;
	}
}

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

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leader.discordId === source.user.id)
			throw 'You cannot leave a faction you are a leader of. Use `/faction disband` or `/faction transfer <user>` instead.';

		await prisma.faction.update({
			where: {
				id: faction.id,
			},
			data: {
				members: {
					disconnect: {
						discordId: source.user.id,
					},
				},
			},
		});

		return `You have left <@${faction.leader.discordId}>'s faction of **${faction.members.length} players**.`;
	}
}

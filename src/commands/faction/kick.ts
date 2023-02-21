import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class FactionKickCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Kicks a member from your faction.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to kick from the faction',
			})
		);
	}

	public async run(source: CommandSource, user: User) {
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
					where: {
						discordId: user.id,
					},
					select: {
						discordId: true,
					},
				},
			},
		});

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leader.discordId !== source.user.id)
			throw `Only the faction leader, <@${faction.leader.discordId}>, can kick faction members.`;
		if (source.user.id === user.id)
			throw 'You cannot kick yourself from the faction.';
		if (!faction.members.some(m => m.discordId === user.id))
			throw `${user} cannot be kicked as they are not a member of the faction.`;

		await prisma.faction.update({
			where: {
				id: faction.id,
			},
			data: {
				members: {
					disconnect: {
						discordId: user.id,
					},
				},
			},
		});

		return `You have kicked ${user} from the faction.`;
	}
}

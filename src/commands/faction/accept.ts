import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class FactionAcceptCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Accepts a faction invite.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user whose invite you want to accept',
			})
		);
	}

	public async run(source: CommandSource, user: User) {
		if (source.user.id === user.id)
			throw 'You cannot accept an invite from yourself.';

		const faction = await prisma.faction.findFirst({
			where: {
				members: {
					some: {
						discordId: user.id,
					},
				},
				invites: {
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
			},
		});

		if (faction === null) throw `${user} has not invited you to their faction.`;

		const selfFaction = await prisma.faction.findFirst({
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
			},
		});

		// Shouldn't be possible, but just in case
		if (faction.id === selfFaction?.id) throw `You are already in <@${faction.leader.discordId}>'s faction.`;

		if (selfFaction !== null) {
			if (selfFaction.leader.discordId !== source.user.id)
				throw `You must leave your current faction before accepting the invite to <@${faction.leader.discordId}>'s faction.`;
			else
				throw `You must transfer leadership or disband your current faction before accepting the invite to <@${faction.leader.discordId}>'s faction.`;
		}

		await prisma.faction.update({
			where: {
				id: faction.id,
			},
			data: {
				invites: {
					disconnect: {
						discordId: source.user.id,
					},
				},
				members: {
					connect: {
						discordId: source.user.id,
					},
				},
			},
		});

		return `You have accepted the invite to <@${faction.leader.discordId}>'s faction.`;
	}
}

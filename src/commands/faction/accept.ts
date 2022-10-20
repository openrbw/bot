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
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		if (source.user.id === user.id)
			throw 'You cannot accept an invite from yourself.';

		const faction = await prisma.faction.findFirst({
			where: {
				members: {
					some: {
						id: user.id,
					},
				},
			},
		});

		if (faction === null) throw `${user} is not in a faction.`;

		const inviteIndex = faction.invites.indexOf(source.user.id);

		if (inviteIndex === -1)
			throw `<@${faction.leaderId}> has not invited you to their faction.`;

		const selfFaction = await prisma.faction.findFirst({
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

		if (selfFaction !== null) {
			if (selfFaction.leaderId !== source.user.id)
				throw `You must leave your current faction before accepting the invite to ${faction.leaderId}'s faction.`;
			else
				throw `You must transfer leadership or disband your current faction before accepting the invite to ${faction.leaderId}'s faction.`;
		}

		// Remove the invite from the array
		faction.invites.splice(inviteIndex, 1);

		await prisma.$transaction([
			prisma.faction.update({
				where: {
					leaderId: faction.leaderId,
				},
				data: {
					invites: faction.invites,
				},
			}),
			prisma.user.update({
				where: {
					id: source.user.id,
				},
				data: {
					factionId: faction.leaderId,
				},
			}),
		]);

		return `You have accepted the invite to <@${faction.leaderId}>'s faction.`;
	}
}

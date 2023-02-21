import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class PartyAcceptCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Accepts a party invite.';
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

		const party = await prisma.party.findFirst({
			where: {
				members: {
					some: {
						discordId: source.user.id,
					},
				},
				invites: {
					some: {
						discordId: user.id,
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

		if (party === null) throw `${user} has not invited you to their party.`;

		const selfParty = await prisma.party.findFirst({
			where: {
				members: {
					some: {
						discordId: source.user.id,
					},
				},
			},
			select: {
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

		if (selfParty !== null) {
			if (selfParty.leader.discordId !== source.user.id)
				throw `You must leave your current party before accepting the invite to <@${party.leader.discordId}>'s party.`;
			if (selfParty.members.length > 1)
				throw `You must transfer leadership or disband your current party before accepting the invite to <@${party.leader.discordId}>'s party.`;
		}

		await prisma.party.update({
			where: {
				id: party.id,
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

		return `You have accepted the invite to <@${party.leader.discordId}>'s party.`;
	}
}

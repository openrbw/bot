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

		const party = await prisma.party.findFirst({
			where: {
				members: {
					some: {
						id: user.id,
					},
				},
			},
		});

		if (party === null) throw `${user} is not in a party.`;

		const inviteIndex = party.invites.indexOf(source.user.id);

		if (inviteIndex === -1)
			throw `<@${party.leaderId}> has not invited you to their party.`;

		const selfParty = await prisma.party.findFirst({
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

		if (selfParty !== null) {
			if (selfParty.leaderId !== source.user.id)
				throw `You must leave your current party before accepting the invite to ${party.leaderId}'s party.`;
			if (selfParty.members.length > 1)
				throw `You must transfer leadership or disband your current party before accepting the invite to ${party.leaderId}'s party.`;
		}

		// Remove the invite from the array
		party.invites.splice(inviteIndex, 1);

		await prisma.$transaction([
			prisma.party.update({
				where: {
					leaderId: party.leaderId,
				},
				data: {
					invites: party.invites,
				},
			}),
			prisma.party.update({
				where: {
					leaderId: source.user.id,
				},
				data: {
					invites: [],
				},
			}),
			prisma.user.update({
				where: {
					id: source.user.id,
				},
				data: {
					partyId: party.leaderId,
				},
			}),
		]);

		return `You have accepted the invite to <@${party.leaderId}>'s party.`;
	}
}

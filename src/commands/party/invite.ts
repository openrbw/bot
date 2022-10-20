import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class PartyInviteCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to invite to the party',
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		if (source.user.id === user.id) throw 'You cannot invite yourself.';

		const party = await prisma.party.findFirst({
			where: {
				leaderId: source.user.id,
			},
			include: {
				members: true,
			},
		});

		if (party === null)
			throw 'You must be registered in order to manage a party.';
		if (party.leaderId !== source.user.id)
			throw 'You must be the party leader in order to manage the party.';

		const player = await prisma.user.findFirst({
			where: {
				id: user.id,
			},
		});

		if (player === null)
			throw `${user} must be registered in order to invite them to the party.`;
		if (party.members.some(m => m.id === user.id))
			throw `${user} is already in the party.`;
		if (party.invites.includes(user.id))
			throw `${user} has already been invited. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;

		await prisma.party.update({
			where: {
				leaderId: source.user.id,
			},
			data: {
				invites: {
					push: user.id,
				},
			},
		});

		return `${user} has been invited to the party. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;
	}
}

import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class FactionInviteCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Invites a player to your faction.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to invite to the faction',
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		if (source.user.id === user.id) throw 'You cannot invite yourself.';

		const player = await prisma.user.findFirst({
			where: {
				id: user.id,
			},
		});

		if (player === null)
			throw `${user} must be registered in order to invite them to the faction.`;

		const faction = await prisma.faction.findFirst({
			where: {
				leaderId: source.user.id,
			},
			include: {
				members: true,
			},
		});

		if (faction === null) {
			await prisma.faction.upsert({
				where: {
					leaderId: source.user.id,
				},
				update: {
					invites: {
						push: user.id,
					},
				},
				create: {
					leaderId: source.user.id,
					members: {
						connect: [
							{
								id: source.user.id,
							},
						],
					},
					invites: [user.id],
				},
			});
		} else {
			if (faction.leaderId !== source.user.id)
				throw 'You must be the faction leader in order to manage the faction.';
			if (faction.members.some(m => m.id === user.id))
				throw `${user} is already in the faction.`;
			if (faction.invites.includes(user.id))
				throw `${user} has already been invited. They can use \`/faction accept ${source.user.tag}\` to accept the invite.`;

			await prisma.faction.update({
				where: {
					leaderId: source.user.id,
				},
				data: {
					invites: {
						push: user.id,
					},
				},
			});
		}

		return `${user} has been invited to the faction. They can use \`/faction accept ${source.user.tag}\` to accept the invite.`;
	}
}

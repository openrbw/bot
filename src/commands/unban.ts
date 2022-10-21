import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionsBitField, User } from 'discord.js';

export default class UnbanCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionsBitField.Flags.ManageRoles);

		this.description = 'Unbans a player from queueing.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to unban',
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		await prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				bannedUntil: {
					set: null,
				},
			},
		});

		return `${user} has been unbanned.`;
	}

	public async catch(error: Error, source: CommandSource, user: User) {
		throw `${user} is not registered so they cannot be unbanned.`;
	}
}

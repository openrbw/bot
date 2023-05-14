import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionsBitField, User } from 'discord.js';

export default class WipeCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionsBitField.Flags.ManageRoles);

		this.description = 'Completely resets all of a player\'s profiles.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to wipe',
			})
		);
	}

	public async run(
		source: CommandSource,
		user: User
	) {
		await prisma.profile.deleteMany({
			where: {
				user: {
					discordId: user.id,
				},
			},
		});

		return `${user}'s profiles have been reset.`;
	}
}

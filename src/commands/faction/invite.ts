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
			})
		);
	}

	public async run(source: CommandSource, user: User) {
		if (source.user.id === user.id) throw 'You cannot invite yourself.';

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
					where: {
						discordId: user.id,
					},
					select: {
						discordId: true,
					},
				},
				invites: {
					where: {
						discordId: user.id,
					},
					select: {
						discordId: true,
					},
				},
				leader: {
					select: {
						discordId: true,
					},
				},
			},
		});

		if (faction === null) {
			await prisma.faction.create({
				data: {
					leader: {
						connectOrCreate: {
							where: {
								discordId: source.user.id,
							},
							create: {
								discordId: source.user.id,
							},
						},
					},
					members: {
						connectOrCreate: {
							where: {
								discordId: source.user.id,
							},
							create: {
								discordId: source.user.id,
							},
						},
					},
					invites: {
						connectOrCreate: {
							where: {
								discordId: user.id,
							},
							create: {
								discordId: user.id,
							},
						},
					},
				},
			});
		} else {
			if (faction.leader.discordId !== source.user.id)
				throw 'You must be the faction leader in order to manage the faction.';
			if (faction.members.some(m => m.discordId === user.id))
				throw `${user} is already in the faction.`;
			if (faction.invites.some(i => i.discordId === user.id))
				throw `${user} has already been invited. They can use \`/faction accept ${source.user.tag}\` to accept the invite.`;

			await prisma.faction.update({
				where: {
					id: faction.id,
				},
				data: {
					invites: {
						connectOrCreate: {
							where: {
								discordId: user.id,
							},
							create: {
								discordId: user.id,
							},
						},
					},
				},
			});
		}

		return `${user} has been invited to the faction. They can use \`/faction accept ${source.user.tag}\` to accept the invite.`;
	}
}

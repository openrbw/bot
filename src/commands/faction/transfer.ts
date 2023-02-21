import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class FactionTransferCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description =
			'Transfers leadership of your faction to another player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to transfer the faction to',
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
			throw `Only the faction leader, <@${faction.leader.discordId}>, can transfer leadership of the faction.`;
		if (!faction.members.some(m => m.discordId === user.id))
			throw `Faction leadership cannot be transferred to ${user} as they are not a member of the faction.`;

		await prisma.faction.update({
			where: {
				id: faction.id,
			},
			data: {
				leader: {
					connect: {
						discordId: user.id,
					},
				},
			},
		});

		return `You have transferred leadership of your faction to ${user}.`;
	}
}

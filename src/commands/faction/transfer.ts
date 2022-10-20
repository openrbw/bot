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
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		const faction = await prisma.faction.findFirst({
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

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leaderId !== source.user.id)
			throw `Only the faction leader, <@${faction.leaderId}>, can transfer leadership of the faction.`;
		if (!faction.members.some(m => m.id === user.id))
			throw `Faction leadership cannot be transferred to ${user} as they are not a member of the faction.`;

		await prisma.$transaction([
			prisma.faction.update({
				where: {
					leaderId: user.id,
				},
				data: {
					leaderId: source.user.id,
				},
			}),
			prisma.user.update({
				where: {
					id: source.user.id,
				},
				data: {
					faction: {
						create: {
							leaderId: source.user.id,
						},
					},
				},
			}),
		]);

		return `You have transferred leadership of your faction to ${user}.`;
	}

	async catch(error: Error) {
		console.error(error);
	}
}

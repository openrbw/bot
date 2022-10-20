import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class PartyTransferCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to transfer the party to',
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		const party = await prisma.party.findFirst({
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

		if (party === null) throw 'You are not in a party.';
		if (party.leaderId !== source.user.id)
			throw `Only the party leader, <@${party.leaderId}>, can transfer leadership of the party.`;
		if (!party.members.some(m => m.id === user.id))
			throw `Party leadership cannot be transferred to ${user} as they are not a member of the party.`;

		await prisma.$transaction([
			prisma.party.update({
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
					party: {
						create: {
							leaderId: source.user.id,
						},
					},
				},
			}),
		]);

		return `You have transferred leadership of your party to ${user}.`;
	}

	async catch(error: Error) {
		console.error(error);
	}
}

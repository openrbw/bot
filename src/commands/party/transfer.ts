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

		this.description = 'Transfers leadership of your party to another player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to transfer the party to',
			})
		);
	}

	public async run(source: CommandSource, other: User) {
		const user = await prisma.user.findFirst({
			where: {
				discordId: source.user.id,
			},
			select: {
				id: true,
				party: {
					select: {
						id: true,
						members: {
							where: {
								discordId: other.id,
							},
							select: {
								discordId: true,
							},
						},
						leaderId: true,
						leader: {
							select: {
								discordId: true,
							},
						},
					},
				},
			},
		});

		if (user === null || user.party === null) throw 'You are not in a party.';
		if (user.party.leaderId !== user.id)
			throw `Only the party leader, <@${user.party.leader.discordId}>, can transfer leadership of the party.`;
		if (!user.party.members.some(m => m.discordId === other.id))
			throw `Party leadership cannot be transferred to ${user} as they are not a member of the party.`;

		await prisma.party.update({
			where: {
				id: user.party.id,
			},
			data: {
				leader: {
					connect: {
						discordId: other.id,
					},
				},
			},
		});

		return `You have transferred leadership of your party to ${user}.`;
	}

	async catch(error: Error) {
		console.error(error);
	}
}

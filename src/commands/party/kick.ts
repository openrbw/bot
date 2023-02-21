import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class PartyKickCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Kicks a member from your party.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to kick from the party',
			})
		);
	}

	public async run(source: CommandSource, user: User) {
		const party = await prisma.party.findFirst({
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
				leader: {
					select: {
						discordId: true,
					},
				},
			},
		});

		if (party === null) throw 'You are not in a party.';
		if (party.leader.discordId !== source.user.id)
			throw `Only the party leader, <@${party.leader.discordId}>, can kick party members.`;
		if (source.user.id === user.id)
			throw 'You cannot kick yourself from the party.';
		if (!party.members.some(m => m.discordId === user.id))
			throw `${user} cannot be kicked as they are not a member of the party.`;

		await prisma.party.update({
			where: {
				id: party.id,
			},
			data: {
				members: {
					disconnect: {
						discordId: user.id,
					},
				},
			},
		});

		return `You have kicked ${user} from the party.`;
	}
}

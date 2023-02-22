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

		this.description = 'Invites a player to your party.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'other',
				description: 'The other to invite to the party',
			})
		);
	}

	public async run(source: CommandSource, other: User) {
		if (source.user.id === other.id) throw 'You cannot invite yourself.';

		const user = await prisma.user.upsert({
			where: {
				discordId: source.user.id,
			},
			update: {},
			create: {
				discordId: source.user.id,
				partyLeader: {
					create: {},
				},
			},
			select: {
				partyLeader: {
					select: {
						id: true,
					},
				},
			},
		});

		if (user.partyLeader !== null) {
			await prisma.user.update({
				where: {
					discordId: source.user.id,
				},
				data: {
					party: {
						connect: {
							id: user.partyLeader.id,
						},
					},
				},
			});
		}

		const party = await prisma.party.findFirstOrThrow({
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
						discordId: other.id,
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
				invites: {
					where: {
						discordId: other.id,
					},
					select: {
						discordId: true,
					},
				},
			},
		});

		if (party.leader.discordId !== source.user.id)
			throw 'You must be the party leader in order to manage the party.';

		if (party.members.some(m => m.discordId === other.id))
			throw `${other} is already in the party.`;
		if (party.invites.some(i => i.discordId === other.id))
			throw `${other} has already been invited. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;

		await prisma.party.update({
			where: {
				id: party.id,
			},
			data: {
				invites: {
					connectOrCreate: {
						where: {
							discordId: other.id,
						},
						create: {
							discordId: other.id,
						},
					},
				},
			},
		});

		return `${other} has been invited to the party. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;
	}
}

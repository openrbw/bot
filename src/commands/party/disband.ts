import { Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { prisma } from 'database';

export default class PartyDisbandCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Disbands your party.';
	}

	public async run(source: CommandSource) {
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
			throw `Only the party leader, <@${party.leaderId}>, can disband the party.`;

		await prisma.$transaction([
			...party.members.map(member =>
				prisma.user.update({
					where: {
						id: member.id,
					},
					data: {
						party: {
							create: {
								leaderId: member.id,
							},
						},
					},
				}),
			),
			prisma.party.update({
				where: {
					leaderId: source.user.id,
				},
				data: {
					invites: [],
				},
			}),
		]);

		return `You have disbanded your party of **${party.members.length} player${
			party.members.length === 1 ? '' : 's'
		}**.`;
	}
}
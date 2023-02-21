import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { escapeCodeBlock } from 'discord.js';

export default class FactionNameCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Changes the name of your faction.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'name',
				description: 'The new name of your faction',
				maxLength: 16,
				minLength: 3,
			})
		);
	}

	public async run(source: CommandSource, name: string) {
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
			},
		});

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leader.discordId !== source.user.id)
			throw `Only the faction leader, <@${faction.leader.discordId}>, can transfer leadership of the faction.`;

		await prisma.faction.update({
			where: {
				id: faction.id,
			},
			data: {
				name: name,
				nameLower: name.toLowerCase(),
			},
		});

		return `You have changed the name of your faction to \`${escapeCodeBlock(
			name
		)}\`.`;
	}

	async catch(error: Error, source: CommandSource, name: string) {
		throw `The faction name \`${escapeCodeBlock(name)}\` is already taken.`;
	}
}

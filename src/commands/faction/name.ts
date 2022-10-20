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
			}),
		);
	}

	public async run(source: CommandSource, name: string) {
		const faction = await prisma.faction.findFirst({
			where: {
				members: {
					some: {
						id: source.user.id,
					},
				},
			},
		});

		if (faction === null) throw 'You are not in a faction.';
		if (faction.leaderId !== source.user.id)
			throw `Only the faction leader, <@${faction.leaderId}>, can transfer leadership of the faction.`;

		await prisma.faction.update({
			where: {
				leaderId: faction.leaderId,
			},
			data: {
				name: name,
				name_lower: name.toLowerCase(),
			},
		});

		return `You have changed the name of your faction to \`${escapeCodeBlock(
			name,
		)}\`.`;
	}

	async catch(error: Error, source: CommandSource, name: string) {
		throw `The faction name \`${escapeCodeBlock(name)}\` is already taken.`;
	}
}

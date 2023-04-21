import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

export default class DeleteModeCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Deletes an existing mode.';
		this.arguments.push(
			new Argument({
				name: 'name',
				description: 'The name of the mode',
				type: ArgumentType.String,
			})
		);
	}

	public async run(
		_: CommandSource,
		name: string
	) {
		const mode = await prisma.mode.delete({
			where: {
				nameLower: name.toLowerCase(),
			},
			select: {
				name: true,
			},
		});

		return `Successfully deleted the mode \`${mode.name}\`.`;
	}

	public async catch(_: Error, __: CommandSource, name: string) {
		const queues = await prisma.queue.findMany({
			where: {
				mode: {
					nameLower: name.toLowerCase(),
				},
			},
			select: {
				channelId: true,
			},
		});

		if (queues.length) {
			throw `The mode \`${name}\` is being used by the following queues:\n${queues.map(q => `<#${q.channelId}>`).join('\n')}`;
		}

		throw `The mode \`${name}\` does not exist.`;
	}
}

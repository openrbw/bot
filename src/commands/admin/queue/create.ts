import { queueToMode } from '@handlers/queue';
import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

export default class CreateQueueCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Creates a new queue channel.';
		this.arguments.push(
			new Argument({
				name: 'name',
				description: 'The name of the queue',
				type: ArgumentType.String,
				maxLength: 100,
			}),
			new Argument({
				name: 'mode',
				description: 'The mode of the queue',
				type: ArgumentType.String,
				choices: [
					{
						name: 'Open',
						value: Mode.Open,
					},
					{
						name: 'Unranked',
						value: Mode.Unranked,
					},
					{
						name: 'Ranked',
						value: Mode.Ranked,
					},
				],
			}),
		);
	}

	public async run(source: CommandSource, name: string, mode: Mode) {
		const channel = await source.guild.channels.create({
			name,
			type: ChannelType.GuildVoice,
		});

		await prisma.queue.create({
			data: {
				id: channel.id,
				guildId: channel.guildId,
				mode,
			},
		});

		queueToMode.set(channel.id, mode);

		return `Successfully created the \`${mode}\` queue ${channel}.`;
	}

	public async catch() {
		throw 'An error ocurred while trying to create the queue channel. Please try again later.';
	}
}

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

export default class DeleteQueue extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Deletes an existing queue channel.';
		this.arguments.push(
			new Argument({
				name: 'channel',
				description: 'The queue channel',
				type: ArgumentType.Channel,
				filter: c => c.type === ChannelType.GuildVoice,
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

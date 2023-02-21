import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { ChannelType, PermissionFlagsBits, VoiceChannel } from 'discord.js';

export default class DeleteQueueCommand extends Command {
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
				error: 'You did not provide a voice channel.',
			})
		);
	}

	public async run(source: CommandSource, channel: VoiceChannel) {
		const queue = await prisma.queue.delete({
			where: {
				guildId_channelId: {
					guildId: source.guildId,
					channelId: channel.id,
				},
			},
			select: {
				mode: {
					select: {
						name: true,
					},
				},
			},
		});

		return `Successfully deleted the \`${queue.mode.name}\` queue ${channel}.`;
	}

	public async catch() {
		throw 'An error ocurred while trying to delete the queue channel. Please try again later.';
	}
}

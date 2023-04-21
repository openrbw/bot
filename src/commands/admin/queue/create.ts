import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { ChannelType, Events, Interaction, PermissionFlagsBits } from 'discord.js';

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
				autocomplete: true,
			})
		);
	}

	@EventHandler()
	public async [Events.InteractionCreate](interaction: Interaction) {
		if (!interaction.isAutocomplete()) return;
		if (!this.is(interaction)) return;

		const modes = await prisma.mode.findMany({
			where: {
				nameLower: {
					contains: interaction.options.getString('mode', true).toLowerCase(),
				},
			},
			select: {
				name: true,
			},
			take: 25,
		});

		if (modes.length) {
			return interaction.respond(modes.map(m => ({
				name: m.name,
				value: m.name,
			})));
		}

		const defaultModes = await prisma.mode.findMany({
			orderBy: {
				name: 'asc',
			},
			select: {
				id: true,
				name: true,
			},
			take: 25,
		});

		return interaction.respond(defaultModes.map(m => ({
			name: m.name,
			value: m.name,
		})));
	}

	public async run(source: CommandSource, name: string, modeName: string) {
		const channel = await source.guild.channels.create({
			name,
			type: ChannelType.GuildVoice,
		});

		const queue = await prisma.queue.create({
			data: {
				channelId: channel.id,
				guildId: channel.guildId,
				mode: {
					connectOrCreate: {
						where: {
							nameLower: modeName.toLowerCase(),
						},
						create: {
							name: modeName,
							nameLower: modeName.toLowerCase(),
						},
					},
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

		return `Successfully created the \`${queue.mode.name}\` queue ${channel}.`;
	}

	public async catch() {
		throw 'An error ocurred while trying to create the queue channel. Please try again later.';
	}
}

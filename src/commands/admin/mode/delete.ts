import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { Events, Interaction, PermissionFlagsBits } from 'discord.js';

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
					contains: interaction.options.getString('name', true).toLowerCase(),
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

	public async run(
		_: CommandSource,
		name: string
	) {
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

		if (queues.length)
			throw `The mode \`${name}\` is being used by the following queues:\n${queues.map(q => `<#${q.channelId}>`).join('\n')}`;

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
		throw `The mode \`${name}\` does not exist.`;
	}
}

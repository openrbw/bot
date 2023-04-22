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

export default class EditModeCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Creates a new mode.';
		this.arguments.push(
			new Argument({
				name: 'name',
				description: 'The name of the mode',
				type: ArgumentType.String,
				autocomplete: true,
			}),
			new Argument({
				name: 'new_name',
				description: 'The new name of the mode',
				type: ArgumentType.String,
				required: false,
			}),
			new Argument({
				name: 'teams',
				description: 'The number of teams',
				type: ArgumentType.Integer,
				minValue: 2,
				required: false,
			}),
			new Argument({
				name: 'team_size',
				description: 'The number of players per team',
				type: ArgumentType.Integer,
				minValue: 1,
				required: false,
			}),
			new Argument({
				name: 'maximum_std_dev',
				description: 'The maximum standard deviation',
				type: ArgumentType.Number,
				minValue: 0,
				required: false,
			}),
			new Argument({
				name: 'connector',
				description: 'The connector',
				type: ArgumentType.String,
				required: false,
			}),
			new Argument({
				name: 'category',
				description: 'The category',
				type: ArgumentType.String,
				required: false,
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
		name: string,
		newName?: string,
		teams?: number,
		playersPerTeam?: number,
		maximumStdDev?: number,
		connector?: string,
		category?: string
	) {
		const mode = await prisma.mode.update({
			where: {
				nameLower: name.toLowerCase(),
			},
			data: {
				name: newName,
				nameLower: newName?.toLowerCase(),
				teams,
				playersPerTeam,
				maximumStdDev,
				connector,
				category,
			},
			select: {
				name: true,
			},
		});

		return `Successfully edited the mode \`${mode.name}\`.`;
	}

	public async catch(_: Error, __: CommandSource, name: string, newName?: string) {
		throw `The mode \`${name}\` does not exist${newName !== undefined ? ` or the name \`${newName}\` does not exist` : ''}. Maybe try \`/admin mode create\` instead?`;
	}
}

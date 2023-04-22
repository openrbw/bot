import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

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
			}),
			new Argument({
				name: 'display_name',
				description: 'The display name of the mode',
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

	public async run(
		_: CommandSource,
		name: string,
		displayName?: string,
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
				name,
				displayName,
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

		return `Successfully created the mode \`${mode.name}\`.`;
	}

	public async catch(_: Error, __: CommandSource, name: string) {
		throw `The mode \`${name}\` does not exist. Maybe try \`/admin mode create\` instead?`;
	}
}

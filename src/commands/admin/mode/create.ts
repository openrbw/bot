import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

export default class CreateModeCommand extends Command {
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
			})
		);
	}

	public async run(
		_: CommandSource,
		name: string,
		teams?: number,
		playersPerTeam?: number,
		maximumStdDev?: number,
		connector?: string
	) {
		const mode = await prisma.mode.create({
			data: {
				name,
				nameLower: name.toLowerCase(),
				teams,
				playersPerTeam,
				maximumStdDev,
				connector,
			},
			select: {
				name: true,
			},
		});

		return `Successfully created the mode \`${mode.name}\`.`;
	}

	public async catch(_: Error, __: CommandSource, name: string) {
		throw `The mode \`${name}\` already exists. Maybe try \`/admin mode edit\` instead?`;
	}
}

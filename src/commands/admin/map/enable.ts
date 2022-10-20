import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

export default class EnableMapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Enables a map.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'name',
				description: 'The name of the map',
				maxLength: 32,
			}),
		);
	}

	public async run(_: CommandSource, name: string) {
		await prisma.map.update({
			where: {
				name_lower: name.toLowerCase(),
			},
			data: {
				enabled: true,
			},
		});

		return `Enabled the map by the name of \`${name}\`.`;
	}

	public async catch(error: Error, source: CommandSource, name: string) {
		throw `A map by the name of \`${name}\` does not exist.`;
	}
}

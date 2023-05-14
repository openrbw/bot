import fs from 'node:fs/promises';

import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { PermissionFlagsBits } from 'discord.js';

import { config } from '$/config';

export default class CooldownCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Modifies the cooldown before starting a game.';
		this.arguments.push(
			new Argument({
				name: 'ms',
				description: 'The new cooldown in milliseconds',
				type: ArgumentType.Integer,
				minValue: 0,
				required: true,
			})
		);
	}

	public async run(_source: CommandSource, ms: number) {
		config.cooldown = ms;

		await fs.writeFile('./config.json', JSON.stringify(config, null, '\t'));

		return `Successfully set cooldown to **${ms / 1_000} seconds**.`;
	}
}

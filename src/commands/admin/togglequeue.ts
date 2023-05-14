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

export default class ToggleQueueCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Enables and disables all queues.';
		this.arguments.push(
			new Argument({
				name: 'enable',
				description: 'Whether to enable the queues',
				type: ArgumentType.Boolean,
				required: false,
			})
		);
	}

	public async run(_source: CommandSource, enable?: boolean) {
		if (enable === undefined) {
			config.queueEnabled = !config.queueEnabled;
		} else {
			config.queueEnabled = enable;
		}

		await fs.writeFile('./config.json', JSON.stringify(config, null, '\t'));

		return `Successfully **${config.queueEnabled ? 'enabled' : 'disabled'}** queues.`;
	}
}

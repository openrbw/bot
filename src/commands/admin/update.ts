import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Command, CommandOptions } from '@matteopolak/framecord';
import { backend } from 'config';
import { PermissionFlagsBits } from 'discord.js';

import { GameManager } from '$/managers/game';

const execFilePromise = promisify(execFile);

export default class RestartCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.Administrator);

		this.description = 'Updates the bot and restarts it.';
	}

	public async run() {
		if (GameManager.activeGames !== 0) {
			throw `There ${
				GameManager.activeGames === 1
					? 'is **1** active game '
					: `are **${GameManager.activeGames}** active games `
			} running at the moment. Please wait for them to finish before performing any updates.`;
		}

		await execFilePromise(...backend.updateCommand);
		await execFilePromise(...backend.restartCommand);
	}

	public async catch(error: Error) {
		throw `An error ocurred while updating and restarting:\n${error}`;
	}
}

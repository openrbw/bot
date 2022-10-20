import { join } from 'node:path';

import { Client, config } from '@matteopolak/framecord';
import { IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

config.formatting.colour = 0xff0000;
config.formatting.padFields = false;

(async () => {
	const client = new Client({
		intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
	});

	await Promise.all([
		client.compileCommandDirectory(join(__dirname, 'commands')),
		client.compileHandlerDirectory(join(__dirname, 'handlers')),
	]);

	await client.init();

	client.login(process.env.TOKEN);
})();

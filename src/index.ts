import { join } from 'node:path';

import { Client, config } from '@matteopolak/framecord';
import { IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';

import { MinecraftConnector } from '$/connectors/minecraft';
import { addConnector } from '$/managers/game';

dotenv.config();

config.formatting.colour = 0xff0000;
config.formatting.padFields = false;

(async () => {
	const client = new Client({
		intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
		verbose: false,
	});

	addConnector(new MinecraftConnector(client));

	const [commandCount] = await Promise.all([
		client.compileCommandDirectory(join(__dirname, 'commands')),
		client.compileHandlerDirectory(join(__dirname, 'handlers')),
	]);

	console.log(`Loaded ${commandCount} commands`);

	await client.init();

	client.login(process.env.TOKEN);
})();

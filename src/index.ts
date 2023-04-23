import { join } from 'node:path';

import { Client, config } from '@matteopolak/framecord';
import { IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';
import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import { MinecraftConnector } from '$/connectors/minecraft';
import { addConnector } from '$/managers/game';

dotenv.config();

config.formatting.colour = 0xff0000;
config.formatting.padFields = false;

(async () => {
	await i18next.use(resourcesToBackend((lang: string, ns: string) => import(`./locales/${lang}/${ns}.json`)))
		.init({
			partialBundledLanguages: true,
			ns: [],
			fallbackLng: 'en',
		});

	const client = new Client({
		intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildVoiceStates],
		verbose: false,
	});

	// There is no leak, so just disable the warning
	client.setMaxListeners(0);

	addConnector(new MinecraftConnector(client));

	const [commandCount] = await Promise.all([
		client.compileCommandDirectory(join(__dirname, 'commands')),
		client.compileHandlerDirectory(join(__dirname, 'handlers')),
	]);

	console.log(`Loaded ${commandCount} commands`);

	await client.init();

	client.login(process.env.TOKEN);
})();

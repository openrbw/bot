import { join } from 'node:path';

import { Client, config } from '@matteopolak/framecord';
import { IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

config.formatting.colour = 0xff0000;
config.formatting.padFields = false;

const client = new Client({
	intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers],
});

client.compileCommandDirectory(join(__dirname, 'commands'));
client.init();

client.login(process.env.TOKEN);

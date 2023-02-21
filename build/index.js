"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const framecord_1 = require("@matteopolak/framecord");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
framecord_1.config.formatting.colour = 0xff0000;
framecord_1.config.formatting.padFields = false;
(async () => {
    const client = new framecord_1.Client({
        intents: [discord_js_1.IntentsBitField.Flags.Guilds, discord_js_1.IntentsBitField.Flags.GuildMembers],
        verbose: false,
    });
    const [commandCount] = await Promise.all([
        client.compileCommandDirectory((0, node_path_1.join)(__dirname, 'commands')),
        client.compileHandlerDirectory((0, node_path_1.join)(__dirname, 'handlers')),
    ]);
    console.log(`Loaded ${commandCount} commands`);
    await client.init();
    client.login(process.env.TOKEN);
})();

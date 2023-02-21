"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const game_1 = require("../../managers/game");
const framecord_1 = require("@matteopolak/framecord");
const config_1 = require("../../config");
const discord_js_1 = require("discord.js");
const execFilePromise = (0, node_util_1.promisify)(node_child_process_1.execFile);
class RestartCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionFlagsBits.Administrator);
        this.description = 'Updates the bot and restarts it.';
    }
    async run() {
        if (game_1.GameManager.activeGames !== 0) {
            throw `There ${game_1.GameManager.activeGames === 1
                ? 'is **1** active game '
                : `are **${game_1.GameManager.activeGames}** active games `} running at the moment. Please wait for them to finish before performing any updates.`;
        }
        await execFilePromise(...config_1.backend.updateCommand);
        await execFilePromise(...config_1.backend.restartCommand);
    }
    async catch(error) {
        throw `An error ocurred while updating and restarting:\n${error}`;
    }
}
exports.default = RestartCommand;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../database");
const discord_js_1 = require("discord.js");
class UnbanCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionsBitField.Flags.ManageRoles);
        this.description = 'Unbans a player from queueing.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user to unban',
        }));
    }
    async run(source, user) {
        await database_1.prisma.user.update({
            where: {
                discordId: user.id,
            },
            data: {
                bannedUntil: {
                    set: null,
                },
            },
        });
        return `${user} has been unbanned.`;
    }
    async catch(error, source, user) {
        throw `${user} is not registered so they cannot be unbanned.`;
    }
}
exports.default = UnbanCommand;

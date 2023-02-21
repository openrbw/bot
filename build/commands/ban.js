"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const time_1 = require("../util/time");
const database_1 = require("../database");
const discord_js_1 = require("discord.js");
class BanCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionsBitField.Flags.ManageRoles);
        this.description = 'Bans a player from queueing.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user to ban',
        }), new framecord_1.Argument({
            type: framecord_1.ArgumentType.Integer,
            name: 'duration',
            description: 'The amount of time to ban the user for',
            choices: [
                {
                    name: '1 hour',
                    value: 1_000 * 60 * 60,
                },
                {
                    name: '3 hours',
                    value: 1_000 * 60 * 60 * 3,
                },
                {
                    name: '6 hours',
                    value: 1_000 * 60 * 60 * 6,
                },
                {
                    name: '12 hours',
                    value: 1_000 * 60 * 60 * 12,
                },
                {
                    name: '1 day',
                    value: 1_000 * 60 * 60 * 24,
                },
                {
                    name: '1 week',
                    value: 1_000 * 60 * 60 * 24 * 7,
                },
                {
                    name: '1 month (30 days)',
                    value: 1_000 * 60 * 60 * 24 * 30,
                },
                {
                    name: '1 year',
                    value: 1_000 * 60 * 60 * 24 * 365,
                },
                {
                    name: 'Forever',
                    value: 0,
                },
            ],
            required: false,
        }), new framecord_1.Argument({
            type: framecord_1.ArgumentType.String,
            name: 'custom',
            description: 'A custom amount of time to ban for. Format: 1s 1m 1h 1d 1w 1mo 1y',
            mapper: time_1.parseTimeString,
            ignoreIfDefined: -1,
            required: false,
            default: 0,
        }), new framecord_1.Argument({
            type: framecord_1.ArgumentType.Boolean,
            name: 'overwrite',
            description: 'If true (default), the user\'s ban will be replaced with this one.',
            default: true,
            required: false,
        }));
    }
    async run(source, user, duration, overwrite) {
        const updated = await database_1.prisma.user.update({
            where: {
                discordId: user.id,
            },
            data: {
                bannedUntil: {
                    [overwrite ? 'set' : 'increment']: overwrite
                        ? Date.now() + duration
                        : duration,
                },
            },
        });
        return `${user}'s ban will expire <t:${updated.bannedUntil / 1000n}:R>`;
    }
    async catch(error, source, user) {
        throw `${user} is not registered so they cannot be banned.`;
    }
}
exports.default = BanCommand;

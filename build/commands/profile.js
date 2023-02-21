"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../database");
class ProfileCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Shows the profile of a player.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'player',
            description: 'The player whose profile you want to view',
            default: s => s.user,
            required: false,
        }), new framecord_1.Argument({
            type: framecord_1.ArgumentType.String,
            name: 'mode',
            description: 'The mode of the profile to view',
            required: false,
            mapper: n => database_1.prisma.mode.findFirst({
                where: {
                    nameLower: n.toLowerCase(),
                },
            }),
            filter: m => m !== null,
            error: 'Invalid mode provided.',
        }));
    }
    async run(source, user, mode) {
        const profile = await database_1.prisma.profile.findFirst({
            where: {
                user: {
                    discordId: user.id,
                },
                modeId: mode.id,
            },
        });
        if (profile === null)
            throw `${user} has not played \`${mode.name}\` yet.`;
        return (0, framecord_1.embed)({
            author: {
                name: `${user.tag}'s ${mode} Profile`,
                icon_url: user.displayAvatarURL(),
            },
            thumbnail: {
                url: user.displayAvatarURL(),
            },
            fields: [
                {
                    name: 'Wins',
                    value: profile.wins.toString(),
                    inline: true,
                },
                {
                    name: 'Losses',
                    value: profile.losses.toString(),
                    inline: true,
                },
                {
                    name: 'W/L',
                    value: (profile.wins / (profile.losses || 1)).toFixed(2),
                    inline: true,
                },
            ],
        });
    }
}
exports.default = ProfileCommand;

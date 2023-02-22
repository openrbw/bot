"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../../database");
const discord_js_1 = require("discord.js");
class CreateModeCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionFlagsBits.ManageGuild);
        this.description = 'Creates a new mode.';
        this.arguments.push(new framecord_1.Argument({
            name: 'name',
            description: 'The name of the mode',
            type: framecord_1.ArgumentType.String,
        }), new framecord_1.Argument({
            name: 'teams',
            description: 'The number of teams',
            type: framecord_1.ArgumentType.Integer,
            minValue: 2,
            required: false,
        }), new framecord_1.Argument({
            name: 'team_size',
            description: 'The number of players per team',
            type: framecord_1.ArgumentType.Integer,
            minValue: 1,
            required: false,
        }), new framecord_1.Argument({
            name: 'maximum_std_dev',
            description: 'The maximum standard deviation',
            type: framecord_1.ArgumentType.Number,
            minValue: 0,
            required: false,
        }), new framecord_1.Argument({
            name: 'connector',
            description: 'The connector',
            type: framecord_1.ArgumentType.String,
            required: false,
        }));
    }
    async run(_, name, teams, playersPerTeam, maximumStdDev, connector) {
        const mode = await database_1.prisma.mode.create({
            data: {
                name,
                nameLower: name.toLowerCase(),
                teams,
                playersPerTeam,
                maximumStdDev,
                connector,
            },
            select: {
                name: true,
            },
        });
        return `Successfully created the mode \`${mode.name}\`.`;
    }
    async catch(_, __, name) {
        throw `The mode \`${name}\` already exists. Maybe try \`/admin mode edit\` instead?`;
    }
}
exports.default = CreateModeCommand;

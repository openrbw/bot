"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../../database");
const discord_js_1 = require("discord.js");
class DeleteModeCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionFlagsBits.ManageGuild);
        this.description = 'Deletes an existing mode.';
        this.arguments.push(new framecord_1.Argument({
            name: 'name',
            description: 'The name of the mode',
            type: framecord_1.ArgumentType.String,
        }));
    }
    async run(_, name) {
        const mode = await database_1.prisma.mode.delete({
            where: {
                nameLower: name.toLowerCase(),
            },
            select: {
                name: true,
            },
        });
        return `Successfully deleted the mode \`${mode.name}\`.`;
    }
}
exports.default = DeleteModeCommand;

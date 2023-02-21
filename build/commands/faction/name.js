"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
const discord_js_1 = require("discord.js");
class FactionNameCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Changes the name of your faction.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.String,
            name: 'name',
            description: 'The new name of your faction',
            maxLength: 16,
            minLength: 3,
        }));
    }
    async run(source, name) {
        const faction = await database_1.prisma.faction.findFirst({
            where: {
                members: {
                    some: {
                        discordId: source.user.id,
                    },
                },
            },
            select: {
                id: true,
                leader: {
                    select: {
                        discordId: true,
                    },
                },
            },
        });
        if (faction === null)
            throw 'You are not in a faction.';
        if (faction.leader.discordId !== source.user.id)
            throw `Only the faction leader, <@${faction.leader.discordId}>, can transfer leadership of the faction.`;
        await database_1.prisma.faction.update({
            where: {
                id: faction.id,
            },
            data: {
                name: name,
                nameLower: name.toLowerCase(),
            },
        });
        return `You have changed the name of your faction to \`${(0, discord_js_1.escapeCodeBlock)(name)}\`.`;
    }
    async catch(error, source, name) {
        throw `The faction name \`${(0, discord_js_1.escapeCodeBlock)(name)}\` is already taken.`;
    }
}
exports.default = FactionNameCommand;

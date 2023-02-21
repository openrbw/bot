"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class FactionDisbandCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Disbands your faction.';
    }
    async run(source) {
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
                members: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (faction === null)
            throw 'You are not in a faction.';
        if (faction.leader.discordId !== source.user.id)
            throw `Only the faction leader, <@${faction.leader.discordId}>, can disband the faction.`;
        await database_1.prisma.faction.delete({
            where: {
                id: faction.id,
            },
        });
        return `You have disbanded your faction of **${faction.members.length} player${faction.members.length === 1 ? '' : 's'}**.`;
    }
}
exports.default = FactionDisbandCommand;

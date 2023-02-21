"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyDisbandCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Disbands your party.';
    }
    async run(source) {
        const party = await database_1.prisma.party.findFirst({
            where: {
                members: {
                    some: {
                        discordId: source.user.id,
                    },
                },
            },
            select: {
                id: true,
                members: {
                    select: {
                        id: true,
                    },
                },
                leader: {
                    select: {
                        discordId: true,
                    },
                },
            },
        });
        if (party === null)
            throw 'You are not in a party.';
        if (party.leader.discordId !== source.user.id)
            throw `Only the party leader, <@${party.leader.discordId}>, can disband the party.`;
        await database_1.prisma.party.delete({
            where: {
                id: party.id,
            },
        });
        return `You have disbanded your party of **${party.members.length} player${party.members.length === 1 ? '' : 's'}**.`;
    }
}
exports.default = PartyDisbandCommand;

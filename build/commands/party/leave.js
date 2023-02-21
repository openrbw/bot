"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyLeaveCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Leaves your current party.';
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
                leader: {
                    select: {
                        discordId: true,
                    },
                },
                leaderId: true,
                members: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (party === null)
            throw 'You are not in a party.';
        if (party.leader.discordId === source.user.id)
            throw 'You cannot leave a party you are a leader of. Use `/party disband` or `/party transfer <user>` instead.';
        await database_1.prisma.user.update({
            where: {
                discordId: source.user.id,
            },
            data: {
                party: {
                    disconnect: true,
                },
            },
        });
        return `You have left <@${party.leaderId}>'s party of **${party.members.length} players**.`;
    }
}
exports.default = PartyLeaveCommand;

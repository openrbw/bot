"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class FactionLeaveCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Leaves your current faction.';
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
        if (faction === null)
            throw 'You are not in a faction.';
        if (faction.leader.discordId === source.user.id)
            throw 'You cannot leave a faction you are a leader of. Use `/faction disband` or `/faction transfer <user>` instead.';
        await database_1.prisma.faction.update({
            where: {
                id: faction.id,
            },
            data: {
                members: {
                    disconnect: {
                        discordId: source.user.id,
                    },
                },
            },
        });
        return `You have left <@${faction.leader.discordId}>'s faction of **${faction.members.length} players**.`;
    }
}
exports.default = FactionLeaveCommand;

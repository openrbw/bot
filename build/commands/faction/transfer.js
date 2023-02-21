"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class FactionTransferCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description =
            'Transfers leadership of your faction to another player.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user to transfer the faction to',
        }));
    }
    async run(source, user) {
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
                    where: {
                        discordId: user.id,
                    },
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
        if (!faction.members.some(m => m.discordId === user.id))
            throw `Faction leadership cannot be transferred to ${user} as they are not a member of the faction.`;
        await database_1.prisma.faction.update({
            where: {
                id: faction.id,
            },
            data: {
                leader: {
                    connect: {
                        discordId: user.id,
                    },
                },
            },
        });
        return `You have transferred leadership of your faction to ${user}.`;
    }
}
exports.default = FactionTransferCommand;

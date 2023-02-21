"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class FactionAcceptCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Accepts a faction invite.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user whose invite you want to accept',
        }));
    }
    async run(source, user) {
        if (source.user.id === user.id)
            throw 'You cannot accept an invite from yourself.';
        const faction = await database_1.prisma.faction.findFirst({
            where: {
                members: {
                    some: {
                        discordId: user.id,
                    },
                },
                invites: {
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
            throw `${user} has not invited you to their faction.`;
        const selfFaction = await database_1.prisma.faction.findFirst({
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
        if (faction.id === selfFaction?.id)
            throw `You are already in <@${faction.leader.discordId}>'s faction.`;
        if (selfFaction !== null) {
            if (selfFaction.leader.discordId !== source.user.id)
                throw `You must leave your current faction before accepting the invite to <@${faction.leader.discordId}>'s faction.`;
            else
                throw `You must transfer leadership or disband your current faction before accepting the invite to <@${faction.leader.discordId}>'s faction.`;
        }
        await database_1.prisma.faction.update({
            where: {
                id: faction.id,
            },
            data: {
                invites: {
                    disconnect: {
                        discordId: source.user.id,
                    },
                },
                members: {
                    connect: {
                        discordId: source.user.id,
                    },
                },
            },
        });
        return `You have accepted the invite to <@${faction.leader.discordId}>'s faction.`;
    }
}
exports.default = FactionAcceptCommand;

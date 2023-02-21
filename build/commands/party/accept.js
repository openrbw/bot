"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyAcceptCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Accepts a party invite.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user whose invite you want to accept',
        }));
    }
    async run(source, user) {
        if (source.user.id === user.id)
            throw 'You cannot accept an invite from yourself.';
        const party = await database_1.prisma.party.findFirst({
            where: {
                members: {
                    some: {
                        discordId: source.user.id,
                    },
                },
                invites: {
                    some: {
                        discordId: user.id,
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
        if (party === null)
            throw `${user} has not invited you to their party.`;
        const selfParty = await database_1.prisma.party.findFirst({
            where: {
                members: {
                    some: {
                        discordId: source.user.id,
                    },
                },
            },
            select: {
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
        if (selfParty !== null) {
            if (selfParty.leader.discordId !== source.user.id)
                throw `You must leave your current party before accepting the invite to <@${party.leader.discordId}>'s party.`;
            if (selfParty.members.length > 1)
                throw `You must transfer leadership or disband your current party before accepting the invite to <@${party.leader.discordId}>'s party.`;
        }
        await database_1.prisma.party.update({
            where: {
                id: party.id,
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
        return `You have accepted the invite to <@${party.leader.discordId}>'s party.`;
    }
}
exports.default = PartyAcceptCommand;

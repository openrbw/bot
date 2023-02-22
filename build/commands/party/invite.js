"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyInviteCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Invites a player to your party.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'other',
            description: 'The other to invite to the party',
        }));
    }
    async run(source, other) {
        if (source.user.id === other.id)
            throw 'You cannot invite yourself.';
        const user = await database_1.prisma.user.upsert({
            where: {
                discordId: source.user.id,
            },
            update: {},
            create: {
                discordId: source.user.id,
                partyLeader: {
                    create: {},
                },
            },
            select: {
                partyLeader: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        await database_1.prisma.user.update({
            where: {
                discordId: source.user.id,
            },
            data: {
                party: {
                    connect: {
                        id: user.partyLeader.id,
                    },
                },
            },
        });
        const party = await database_1.prisma.party.findFirstOrThrow({
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
                    where: {
                        discordId: other.id,
                    },
                    select: {
                        discordId: true,
                    },
                },
                leader: {
                    select: {
                        discordId: true,
                    },
                },
                invites: {
                    where: {
                        discordId: other.id,
                    },
                    select: {
                        discordId: true,
                    },
                },
            },
        });
        if (party.leader.discordId !== source.user.id)
            throw 'You must be the party leader in order to manage the party.';
        if (party.members.some(m => m.discordId === other.id))
            throw `${other} is already in the party.`;
        if (party.invites.some(i => i.discordId === other.id))
            throw `${other} has already been invited. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;
        await database_1.prisma.party.update({
            where: {
                id: party.id,
            },
            data: {
                invites: {
                    connectOrCreate: {
                        where: {
                            discordId: other.id,
                        },
                        create: {
                            discordId: other.id,
                        },
                    },
                },
            },
        });
        return `${other} has been invited to the party. They can use \`/party accept ${source.user.tag}\` to accept the invite.`;
    }
}
exports.default = PartyInviteCommand;

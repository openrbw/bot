"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyTransferCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Transfers leadership of your party to another player.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user to transfer the party to',
        }));
    }
    async run(source, other) {
        const user = await database_1.prisma.user.findFirst({
            where: {
                discordId: source.user.id,
            },
            select: {
                id: true,
                party: {
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
                        leaderId: true,
                        leader: {
                            select: {
                                discordId: true,
                            },
                        },
                    },
                },
            },
        });
        if (user === null || user.party === null)
            throw 'You are not in a party.';
        if (user.party.leaderId !== user.id)
            throw `Only the party leader, <@${user.party.leader.discordId}>, can transfer leadership of the party.`;
        if (!user.party.members.some(m => m.discordId === other.id))
            throw `Party leadership cannot be transferred to ${user} as they are not a member of the party.`;
        await database_1.prisma.party.update({
            where: {
                id: user.party.id,
            },
            data: {
                leader: {
                    connect: {
                        discordId: other.id,
                    },
                },
            },
        });
        return `You have transferred leadership of your party to ${user}.`;
    }
    async catch(error) {
        console.error(error);
    }
}
exports.default = PartyTransferCommand;

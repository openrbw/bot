"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyKickCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Kicks a member from your party.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.User,
            name: 'user',
            description: 'The user to kick from the party',
        }));
    }
    async run(source, user) {
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
                    where: {
                        discordId: user.id,
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
            },
        });
        if (party === null)
            throw 'You are not in a party.';
        if (party.leader.discordId !== source.user.id)
            throw `Only the party leader, <@${party.leader.discordId}>, can kick party members.`;
        if (source.user.id === user.id)
            throw 'You cannot kick yourself from the party.';
        if (!party.members.some(m => m.discordId === user.id))
            throw `${user} cannot be kicked as they are not a member of the party.`;
        await database_1.prisma.party.update({
            where: {
                id: party.id,
            },
            data: {
                members: {
                    disconnect: {
                        discordId: user.id,
                    },
                },
            },
        });
        return `You have kicked ${user} from the party.`;
    }
}
exports.default = PartyKickCommand;

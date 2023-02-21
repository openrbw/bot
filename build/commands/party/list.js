"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class PartyListCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Lists the players in your party.';
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
                members: {
                    select: {
                        discordId: true,
                    },
                },
            },
        });
        if (party === null)
            throw 'You are not in a party.';
        const leader = party.leader.discordId === source.user.id
            ? source.user
            : await this.client.users
                .fetch(party.leader.discordId, { cache: false })
                .catch(() => null);
        const data = {
            fields: [
                {
                    name: `Members (${party.members.length})`,
                    value: party.members.map(m => `<@${m.discordId}>`).join('\n'),
                },
            ],
        };
        if (leader === null) {
            data.description = `<@${party.leader.discordId}>'s Party`;
        }
        else {
            data.author = {
                name: `${leader.tag}'s Party`,
                icon_url: leader.displayAvatarURL(),
            };
        }
        return (0, framecord_1.embed)(data);
    }
}
exports.default = PartyListCommand;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../database");
class FactionListCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Lists the players in your faction.';
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
                name: true,
                leaderId: true,
                leader: {
                    select: {
                        discordId: true,
                    },
                },
                members: {
                    select: {
                        id: true,
                        discordId: true,
                    },
                },
            },
        });
        if (faction === null)
            throw 'You are not in a faction.';
        const leader = faction.leader.discordId === source.user.id
            ? source.user
            : await this.client.users
                .fetch(faction.leader.discordId, { cache: false })
                .catch(() => null);
        const data = {
            fields: [
                {
                    name: `Members (${faction.members.length})`,
                    value: faction.members.map(m => `<@${m.id}>`).join('\n'),
                },
            ],
        };
        if (leader === null) {
            data.description = faction.name ?? `<@${faction.leaderId}>'s Faction`;
        }
        else {
            data.author = {
                name: faction.name ?? `${leader.tag}'s Faction`,
                icon_url: leader.displayAvatarURL(),
            };
        }
        return (0, framecord_1.embed)(data);
    }
}
exports.default = FactionListCommand;

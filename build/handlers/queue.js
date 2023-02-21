"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservedIds = exports.modeAndGuildToQueueData = exports.modeAndGuildToQueueList = void 0;
const game_1 = require("../managers/game");
const framecord_1 = require("@matteopolak/framecord");
const iter_1 = require("../util/iter");
const math_1 = require("../util/math");
const database_1 = require("../database");
const discord_js_1 = require("discord.js");
const fast_sort_1 = require("fast-sort");
exports.modeAndGuildToQueueList = new Map();
exports.modeAndGuildToQueueData = new Map();
exports.reservedIds = new Set();
class QueueHandler extends framecord_1.Handler {
    manager = new game_1.GameManager({ client: this.client });
    async init() {
        this.client.registerHandler(this.manager);
    }
    async isSliceValid(parties, config) {
        const teams = Array.from({ length: config.teams }, () => 0);
        for (const party of parties) {
            const index = teams.findIndex(n => party.members.length + n <= config.playersPerTeam);
            if (index === -1)
                return false;
            teams[index] += party.members.length;
        }
        return true;
    }
    async searchForGame(queue) {
        const guild = this.client.guilds.cache.get(queue.guildId);
        if (guild === undefined)
            return;
        const teamSize = queue.mode.playersPerTeam;
        const size = teamSize * queue.mode.teams;
        const parties = await database_1.prisma.party.findMany({
            where: {
                members: {
                    every: {
                        AND: [
                            {
                                NOT: {
                                    bannedUntil: 0,
                                },
                            },
                            {
                                OR: [
                                    {
                                        bannedUntil: {
                                            equals: null,
                                        },
                                    },
                                    {
                                        bannedUntil: {
                                            lt: Date.now(),
                                        },
                                    },
                                ],
                            },
                        ],
                        discordId: {
                            in: (0, iter_1.iter)(queue.players)
                                .filter(p => !exports.reservedIds.has(p))
                                .toArray(),
                        },
                    },
                },
            },
            include: {
                members: {
                    include: {
                        profiles: {
                            where: {
                                modeId: {
                                    equals: queue.modeId,
                                },
                            },
                        },
                    },
                },
            },
        });
        const rawPartyCount = parties.length;
        for (let i = 0; i < rawPartyCount; ++i) {
            const party = parties[i];
            if (party.members.length > teamSize) {
                (0, fast_sort_1.inPlaceSort)(party.members).desc(m => m.profiles[0]?.rating ?? 0);
                while (party.members.length > teamSize) {
                    const split = party.members.splice(0, teamSize);
                    parties.push({
                        leaderId: party.leaderId,
                        members: split,
                        id: party.id,
                    });
                }
            }
        }
        const partyCount = parties.length;
        let lowest = [];
        let lowestStdev = Infinity;
        (0, fast_sort_1.inPlaceSort)(parties).desc(p => p.members.reduce((a, b) => a + (b.profiles[0]?.rating ?? 0), 0) /
            p.members.length);
        for (let i = 0; i <= partyCount; ++i) {
            let players = 0;
            const sliceIndex = parties.findIndex((a, b) => b >= i && (players += a.members.length) === size);
            if (sliceIndex === -1)
                continue;
            const slice = parties.slice(i, sliceIndex + 1);
            const deviation = (0, math_1.stdev)(slice.flatMap(s => s.members.map(m => m.profiles[0]?.rating ?? 0)));
            if (deviation > queue.mode.maximumStdDev)
                continue;
            if (!this.isSliceValid(slice, queue.mode))
                continue;
            if (deviation < lowestStdev) {
                lowest = slice;
                lowestStdev = deviation;
            }
        }
        if (lowest.length === 0)
            return;
        return game_1.GameManager.initializeGame(queue, lowest, guild);
    }
    async addPlayer(state) {
        if (state.channelId === null)
            return;
        const mode = await database_1.prisma.mode.findFirst({
            where: {
                queues: {
                    some: {
                        channelId: state.channelId,
                    },
                },
            },
            include: {
                states: true,
            },
        });
        if (!mode)
            return;
        const user = await database_1.prisma.user.upsert({
            where: {
                discordId: state.id,
            },
            create: {
                discordId: state.id,
                profiles: {
                    create: {
                        modeId: mode.id,
                    },
                },
            },
            update: {},
        });
        if (!user)
            return;
        if (!user.partyId)
            user.partyId = user.id;
        const key = `${state.guild.id}.${mode}`;
        const queue = exports.modeAndGuildToQueueList.get(key) ??
            exports.modeAndGuildToQueueList
                .set(key, {
                mode,
                modeId: mode.id,
                players: new Set(),
                guildId: state.guild.id,
            })
                .get(key);
        queue.players.add(user.discordId);
        this.searchForGame(queue);
    }
    async removePlayer(state) {
        if (!state.channelId)
            return;
        const mode = await database_1.prisma.mode.findFirst({
            where: {
                queues: {
                    some: {
                        channelId: state.channelId,
                    },
                },
            },
            include: {
                states: true,
            },
        });
        if (!mode)
            return;
        const queue = exports.modeAndGuildToQueueList.get(`${state.guild.id}.${mode}`);
        queue?.players.delete(state.id);
    }
    async ready() {
        const queues = await database_1.prisma.queue.findMany();
        for (const queue of queues) {
            const guild = this.client.guilds.cache.get(queue.guildId);
            const channel = guild?.channels.cache.get(queue.channelId);
            if (channel?.type !== discord_js_1.ChannelType.GuildVoice) {
                await database_1.prisma.queue.delete({
                    where: {
                        id: queue.id,
                    },
                });
                continue;
            }
            const key = `${queue.guildId}.${queue.modeId}`;
            const data = exports.modeAndGuildToQueueData.get(key) ??
                exports.modeAndGuildToQueueData.set(key, []).get(key);
            data.push({ channelId: queue.channelId });
            for (const [, member] of channel.members) {
                this.addPlayer({
                    id: member.id,
                    channelId: queue.channelId,
                    guild: { id: queue.guildId },
                });
            }
        }
    }
    async voiceStateUpdate(oldState, newState) {
        if (oldState.channelId === newState.channelId)
            return;
        if (oldState !== null) {
            this.removePlayer(oldState);
        }
        if (newState !== null) {
            this.addPlayer(newState);
        }
    }
}
__decorate([
    (0, framecord_1.EventHandler)({ once: true })
], QueueHandler.prototype, "ready", null);
__decorate([
    (0, framecord_1.EventHandler)()
], QueueHandler.prototype, "voiceStateUpdate", null);
exports.default = QueueHandler;

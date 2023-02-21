"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const queue_1 = require("../handlers/queue");
const framecord_1 = require("@matteopolak/framecord");
const forge_1 = require("../util/forge");
const iter_1 = require("../util/iter");
const database_1 = require("../database");
const discord_js_1 = require("discord.js");
const fast_sort_1 = require("fast-sort");
function isCategoryChannel(channel) {
    return channel?.type === discord_js_1.ChannelType.GuildCategory;
}
const MAX_CHANNELS_PER_CATEGORY = 50;
const DEFAULT_VOICE_ALLOW_PERMISSIONS = discord_js_1.PermissionsBitField.Flags.Connect &
    discord_js_1.PermissionsBitField.Flags.UseVAD &
    discord_js_1.PermissionsBitField.Flags.Speak &
    discord_js_1.PermissionsBitField.Flags.ViewChannel;
const DEFAULT_TEXT_ALLOW_PERMISSIONS = discord_js_1.PermissionsBitField.Flags.ViewChannel &
    discord_js_1.PermissionsBitField.Flags.SendMessages &
    discord_js_1.PermissionsBitField.Flags.ReadMessageHistory &
    discord_js_1.PermissionsBitField.Flags.AddReactions;
class GameManager extends framecord_1.Handler {
    static activeGames = 0;
    static categories = new discord_js_1.Collection();
    static number = 0;
    async init() {
        const categories = await database_1.prisma.category.findMany();
        const invalid = (0, iter_1.iter)(categories)
            .map(c => this.client.guilds.cache.get(c.guildId)?.channels.cache.get(c.id))
            .filter(isCategoryChannel)
            .tap(c => GameManager.categories.has(c.guildId)
            ? GameManager.categories.get(c.guildId).set(c.id, c)
            : GameManager.categories.set(c.guildId, new discord_js_1.Collection([[c.id, c]])))
            .map(c => c.id)
            .toArray();
        if (invalid.length > 0) {
            await database_1.prisma.category.deleteMany({
                where: {
                    id: {
                        in: invalid,
                    },
                },
            });
        }
        const number = await database_1.prisma.game.findFirst({
            orderBy: {
                id: 'desc',
            },
        });
        GameManager.number = number?.id ?? 0;
    }
    static async getCategoryWithCapacity(guild, needed) {
        const categories = this.categories.get(guild.id) ??
            this.categories.set(guild.id, new discord_js_1.Collection()).get(guild.id);
        const category = categories.find(c => c.children.cache.size <= MAX_CHANNELS_PER_CATEGORY - needed);
        if (category)
            return category;
        const created = await guild.channels.create({
            name: 'Games',
            type: discord_js_1.ChannelType.GuildCategory,
        });
        categories.set(created.id, created);
        await database_1.prisma.category.create({
            data: {
                id: created.id,
                guildId: created.guildId,
            },
        });
        return created;
    }
    static createTeams(queue, parties) {
        const config = queue.mode;
        (0, fast_sort_1.inPlaceSort)(parties).desc([
            p => p.members.length,
            p => p.members.reduce((a, b) => a + (b.profiles[0]?.rating ?? 0), 0) /
                p.members.length,
        ]);
        const teams = (0, iter_1.iter)(parties)
            .take(config.teams)
            .toArray();
        const [groups, individuals] = (0, iter_1.iter)(parties)
            .skip(config.teams)
            .partition(p => p.members.length > 1);
        (0, iter_1.iter)(groups).forEach(p => teams
            .find(t => t.members.length + p.members.length <= config.playersPerTeam)
            ?.members.push(...p.members));
        (0, iter_1.iter)(individuals).forEach(p => teams
            .find(t => t.members.length + p.members.length <= config.playersPerTeam)
            ?.members.push(...p.members));
        for (const team of teams) {
            (0, fast_sort_1.inPlaceSort)(team.members).desc(m => m.profiles[0]?.rating ?? 0);
        }
        return teams.flatMap((t, tx) => t.members.map((m, i) => ({
            userId: m.id,
            user: {
                discordId: m.discordId,
            },
            team: tx,
            index: i,
        })));
    }
    static reservePlayers(players) {
        for (const player of players) {
            queue_1.reservedIds.add(player);
        }
    }
    static releasePlayers(players) {
        for (const player of players) {
            queue_1.reservedIds.delete(player);
        }
    }
    static reserveParties(parties) {
        return this.reservePlayers((0, iter_1.iter)(parties)
            .flatMap(p => p.members)
            .map(m => m.discordId));
    }
    static releaseParties(parties) {
        return this.releasePlayers((0, iter_1.iter)(parties)
            .flatMap(p => p.members)
            .map(m => m.discordId));
    }
    static async movePlayer(userId, channel) {
        try {
            await (0, forge_1.member)(userId, channel.guild).voice.setChannel(channel);
            return true;
        }
        catch {
            return false;
        }
    }
    static async createGameChannels(queue, guild, parties, gameId) {
        const teamCount = queue.mode.teams;
        const category = await this.getCategoryWithCapacity(guild, teamCount + 1);
        const text = await category.children.create({
            name: `Game #${gameId}`,
            permissionOverwrites: (0, iter_1.iter)(parties)
                .flatMap(p => p.members.map(m => ({
                id: m.discordId,
                allow: DEFAULT_TEXT_ALLOW_PERMISSIONS,
            })))
                .toArray(),
        });
        const permissions = Array.from({ length: teamCount }, () => []);
        for (const [index, party] of parties.entries()) {
            if (index < teamCount) {
                permissions[index] = (0, iter_1.iter)(party.members)
                    .map(m => ({
                    id: m.discordId,
                    type: discord_js_1.OverwriteType.Member,
                    allow: DEFAULT_VOICE_ALLOW_PERMISSIONS,
                }))
                    .toArray();
            }
            else {
                permissions[0].push(...(0, iter_1.iter)(party.members).map(m => ({
                    id: m.discordId,
                    type: discord_js_1.OverwriteType.Member,
                    allow: DEFAULT_VOICE_ALLOW_PERMISSIONS,
                })));
            }
        }
        const voice = await Promise.all(permissions.map((p, i) => category.children.create({
            name: `Game #${gameId}, Team #${i + 1}`,
            type: discord_js_1.ChannelType.GuildVoice,
            permissionOverwrites: p,
        })));
        return {
            text,
            voice,
        };
    }
    static async createGame(queue, parties, guild) {
        this.reserveParties(parties);
        const gameId = this.number++;
        const players = this.createTeams(queue, parties);
        const { text, voice } = await this.createGameChannels(queue, guild, parties, gameId);
        await Promise.all(players
            .map(p => this.movePlayer(p.user.discordId, voice[p.team])));
        return await database_1.prisma.game.create({
            data: {
                id: gameId,
                stateId: queue.mode.states[0].id,
                modeId: queue.modeId,
                textChannelId: text.id,
                voiceChannelIds: {
                    set: voice.map(v => v.id),
                },
                users: {
                    createMany: {
                        data: players,
                    },
                },
            },
            include: {
                users: true,
            },
        });
    }
    static async close(game, guild, channel, reason) {
        this.releasePlayers((0, iter_1.iter)(game.users).map(p => p.user.discordId));
        (0, framecord_1.message)(channel, (0, framecord_1.embed)({
            title: 'Game Finished',
            description: `Want to play again?\n${queue_1.modeAndGuildToQueueData
                .get(`${guild.id}.${game.mode.name}`)
                ?.map(q => `<@${q.channelId}>`)
                .join('\n') || 'No queue channels found :('}`,
            fields: [
                {
                    name: 'Reason',
                    value: reason,
                },
            ],
        }));
        return setTimeout(async () => {
            await guild.channels
                .delete(game.textChannelId, `Closing game #${game.id}`)
                .catch(() => null);
            for (const voiceId of game.voiceChannelIds) {
                await guild.channels
                    .delete(voiceId, `Closing game #${game.id}`)
                    .catch(() => null);
            }
            --this.activeGames;
        }, 5_000);
    }
    static async initializeGame(queue, parties, guild) {
        ++this.activeGames;
        await this.createGame(queue, parties, guild);
    }
    async channelDelete(channel) {
        if (channel.type !== discord_js_1.ChannelType.GuildCategory)
            return;
        GameManager.categories.delete(channel.id);
    }
}
__decorate([
    (0, framecord_1.EventHandler)()
], GameManager.prototype, "channelDelete", null);
exports.GameManager = GameManager;

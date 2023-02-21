"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../managers/game");
const framecord_1 = require("@matteopolak/framecord");
const components_1 = require("../util/components");
const iter_1 = require("../util/iter");
const message_1 = require("../util/message");
const config_1 = require("../config");
const database_1 = require("../database");
const discord_js_1 = require("discord.js");
class ScoreCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.description = 'Sends a game to be scored.';
        this.arguments.push(new framecord_1.Argument({
            type: framecord_1.ArgumentType.Attachment,
            name: 'proof',
            description: 'A screenshot of the game results',
        }));
    }
    async run(source, proof) {
        const game = await database_1.prisma.game.findFirst({
            where: {
                textChannelId: source.channelId,
            },
            include: {
                users: {
                    include: {
                        user: true,
                    },
                },
                state: true,
                mode: true,
            },
        });
        if (game === null)
            throw 'This command can only be run in a game channel.';
        if (game.state.index !== 0)
            throw 'You can only score the game after it has started.';
        const scoring = this.client.channels.cache.get(config_1.channels.scoring.channelId);
        if (!scoring || scoring.type !== discord_js_1.ChannelType.GuildText)
            throw 'The scoring channel has not been set up. Please try again later.';
        await database_1.prisma.game.update({
            where: {
                id: game.id,
            },
            data: {
                stateId: 2,
            },
        });
        (0, framecord_1.message)(scoring, {
            embeds: (0, framecord_1.embed)({
                title: `Game \`#${game.id}\``,
                description: `Submitted by ${source.user}`,
                fields: (0, message_1.playersToFields)(game.users),
                image: {
                    url: proof.url,
                },
            }).embeds,
            components: (0, components_1.createTeamButtons)(game.mode.teams, game.id),
        });
        return void game_1.GameManager.close(game, source.guild, source.channel, 'The game has been sent to be scored.');
    }
    async interactionCreate(interaction) {
        if (!interaction.isButton())
            return;
        const [key, gameIdString, teamIndexString] = interaction.customId.split('.');
        if (key !== 'team')
            return;
        const teamIndex = parseInt(teamIndexString);
        const gameId = parseInt(gameIdString);
        const game = await database_1.prisma.game.findFirst({
            where: {
                id: gameId,
            },
            include: {
                users: true,
            },
        });
        if (game === null)
            return;
        await database_1.prisma.$transaction((0, iter_1.iter)(game.users)
            .map(p => {
            const winner = p.team === teamIndex;
            return database_1.prisma.profile.upsert({
                where: {
                    modeId_userId: {
                        modeId: game.modeId,
                        userId: p.userId,
                    },
                },
                update: {
                    wins: {
                        increment: 1,
                    },
                    [winner ? 'winstreak' : 'losestreak']: {
                        increment: 1,
                    },
                    [winner ? 'losestreak' : 'winstreak']: 0,
                    rating: {
                        increment: winner ? 25 : -20,
                    },
                },
                create: {
                    modeId: game.modeId,
                    userId: p.userId,
                    [winner ? 'wins' : 'losses']: 1,
                    [winner ? 'winstreak' : 'losestreak']: 1,
                },
            });
        })
            .toArray());
        await interaction.message.delete();
    }
}
__decorate([
    (0, framecord_1.EventHandler)()
], ScoreCommand.prototype, "interactionCreate", null);
exports.default = ScoreCommand;

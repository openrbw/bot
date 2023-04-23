import { CommandSource, embed, message } from '@matteopolak/framecord';
import { Game, Mode, Profile } from '@prisma/client';
import { Guild, GuildTextBasedChannel } from 'discord.js';

import { ScoreResult } from '$/connectors/base';
import { prisma } from '$/database';
import { GameState, GameWithModeNameAndPlayersWithDiscordIds } from '$/managers/game';

import { createTeamButtons } from './components';
import { computeEloChange, GameResult, GameUserWithProfile, GlickoCalculation, muToRating } from './elo';
import { playersToFields } from './message';
import { computeRoleChanges } from './role';

export type GameWithModeNameAndPlayersWithProfiles = Game & {
	users: GameUserWithProfile[];
	mode: Mode;
}

export const DEFAULT_PHI = 2.01476187242;
export const DEFAULT_MU = 0;
export const DEFAULT_RV = 0.06;
export const DEFAULT_RATING = 400;

export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult.TIE, winnerIdx?: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]>;
export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult.WIN, winnerIdx: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]>;
export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult, winnerIdx?: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]> {
	const scores = result === GameResult.TIE ? computeEloChange(game.users, result) : computeEloChange(game.users, result, winnerIdx!);

	const roleChangePromises: Promise<unknown>[] = [];
	const profiles: Profile[] = [];

	await prisma.$transaction(async tx => {
		await tx.game.update({
			where: {
				id: game.id,
			},
			data: {
				winner: result === GameResult.WIN && winnerIdx !== undefined ? winnerIdx : undefined,
				state: GameState.POST_GAME,
				endedAt: new Date(),
				proof: game.proof,
			},
		});

		for (const player of game.users) {
			const winner = player.team === winnerIdx;
			const score = scores.get(player.userId);

			if (!score) throw new Error(`Score not found for <@${player.user.discordId}>.`);

			const oldProfile = player.user.profiles[0] ?? {
				phi: DEFAULT_PHI,
				mu: DEFAULT_MU,
				rv: DEFAULT_RV,
				rating: DEFAULT_RATING,
			};

			const rating = muToRating(score.mu);

			roleChangePromises.push(computeRoleChanges(game.guildId, game.modeId, oldProfile.rating, rating).then(async roles => {
				for (const role of roles.add) {
					await guild.members.addRole({
						user: player.user.discordId,
						role: role.roleId,
					});
				}

				for (const role of roles.remove) {
					await guild.members.removeRole({
						user: player.user.discordId,
						role: role.roleId,
					});
				}
			}));

			await tx.gameUser.update({
				where: {
					gameId_userId: {
						gameId: game.id,
						userId: player.userId,
					},
				},
				data: {
					phi: score.phi - oldProfile.phi,
					mu: score.mu - oldProfile.mu,
					rv: score.rv - oldProfile.rv,
				},
			});

			profiles.push(await tx.profile.upsert({
				where: {
					modeId_userId: {
						modeId: game.modeId,
						userId: player.userId,
					},
				},
				update: {
					[winner ? 'wins' : 'losses']: {
						increment: 1,
					},
					[winner ? 'winstreak' : 'losestreak']: {
						increment: 1,
					},
					[winner ? 'losestreak' : 'winstreak']: 0,
					phi: score.phi,
					mu: {
						increment: score.mu,
					},
					rv: score.rv,
					rating,
					...scoreResult?.update(player),
				},
				create: {
					modeId: game.modeId,
					userId: player.userId,
					[winner ? 'wins' : 'losses']: 1,
					[winner ? 'winstreak' : 'losestreak']: 1,
					phi: score.phi,
					mu: score.mu,
					rv: score.rv,
					rating,
					...scoreResult?.create(player),
				},
			}));
		}
	});

	await Promise.allSettled(roleChangePromises);

	return [
		scores,
		profiles,
	];
}

export async function sendToScore(scoringChannel: GuildTextBasedChannel, source: CommandSource, game: GameWithModeNameAndPlayersWithDiscordIds) {
	await message(scoringChannel, {
		embeds: embed({
			title: `Game \`#${game.id}\``,
			description: `Submitted by ${source.user}`,
			fields: playersToFields(game.users),
			image: {
				url: game.proof!,
			},
		}).embeds,
		components: createTeamButtons(game.id, game.mode.teams),
	});
}

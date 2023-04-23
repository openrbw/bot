import { Game, Mode, Profile } from '@prisma/client';
import { Guild } from 'discord.js';

import { ScoreResult } from '$/connectors/base';
import { prisma } from '$/database';

import { computeEloChange, GameResult, GameUserWithProfile, GlickoCalculation, muToRating } from './elo';
import { iter } from './iter';
import { computeRoleChanges } from './role';

export type GameWithModeNameAndPlayersWithProfiles = Game & {
	users: GameUserWithProfile[];
	mode: Mode;
}

export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult.TIE, winnerIdx?: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]>;
export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult.WIN, winnerIdx: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]>;
export async function scoreGame(guild: Guild, game: GameWithModeNameAndPlayersWithProfiles, result: GameResult, winnerIdx?: number, scoreResult?: ScoreResult): Promise<[Map<number, GlickoCalculation>, Profile[]]> {
	const scores = result === GameResult.TIE ? computeEloChange(game.users, result) : computeEloChange(game.users, result, winnerIdx!);
	const roleChangePromises = [];

	return [
		scores,
		await prisma.$transaction(
			iter(game.users)
				.map(p => {
					const winner = p.team === winnerIdx;
					const score = scores.get(p.userId);
					if (!score) return undefined!;

					const oldRating = p.user.profiles[0]?.rating ?? 400;
					const rating = muToRating(score.mu);

					roleChangePromises.push(async () => {
						const roles = await computeRoleChanges(game.guildId, game.modeId, oldRating, rating);

						for (const role of roles.add) {
							await guild.members.addRole({
								user: p.user.discordId,
								role: role.roleId,
							});
						}

						for (const role of roles.remove) {
							await guild.members.removeRole({
								user: p.user.discordId,
								role: role.roleId,
							});
						}
					});

					return prisma.profile.upsert({
						where: {
							modeId_userId: {
								modeId: game.modeId,
								userId: p.userId,
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
							...scoreResult?.update(p),
						},
						create: {
							modeId: game.modeId,
							userId: p.userId,
							[winner ? 'wins' : 'losses']: 1,
							[winner ? 'winstreak' : 'losestreak']: 1,
							phi: score.phi,
							mu: score.mu,
							rv: score.rv,
							rating,
							...scoreResult?.create(p),
						},
					});
				})
				.filter(p => p !== undefined)
				.toArray()
		),
	];
}

import { CommandSource, embed, message } from '@matteopolak/framecord';
import { Game, Mode, PrismaPromise, Profile } from '@prisma/client';
import { Guild, GuildTextBasedChannel } from 'discord.js';

import { ScoreResult } from '$/connectors/base';
import { prisma } from '$/database';
import { GameState, GameWithModeNameAndPlayersWithDiscordIds } from '$/managers/game';

import { createTeamButtons } from './components';
import { computeEloChange, GameResult, GameUserWithProfile, GlickoCalculation, muToRating } from './elo';
import { iter } from './iter';
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

	const otherQueries: PrismaPromise<unknown>[] = [];

	otherQueries.push(prisma.game.update({
		where: {
			id: game.id,
		},
		data: {
			winner: result === GameResult.WIN && winnerIdx !== undefined ? winnerIdx : undefined,
			state: GameState.POST_GAME,
			endedAt: new Date(),
		},
	}));

	const profiles = await prisma.$transaction(
		iter(game.users)
			.map(p => {
				const winner = p.team === winnerIdx;
				const score = scores.get(p.userId);
				if (!score) return undefined!;

				const oldProfile = p.user.profiles[0] ?? {
					phi: DEFAULT_PHI,
					mu: DEFAULT_MU,
					rv: DEFAULT_RV,
					rating: DEFAULT_RATING,
				};

				const rating = muToRating(score.mu);

				roleChangePromises.push(computeRoleChanges(game.guildId, game.modeId, oldProfile.rating, rating).then(async roles => {
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
				}));

				otherQueries.push(prisma.gameUser.update({
					where: {
						gameId_userId: {
							gameId: game.id,
							userId: p.userId,
						},
					},
					data: {
						phi: score.phi - oldProfile.phi,
						mu: score.mu - oldProfile.mu,
						rv: score.rv - oldProfile.rv,
					},
				}));

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
	);

	await prisma.$transaction(otherQueries);
	await Promise.all(roleChangePromises);

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

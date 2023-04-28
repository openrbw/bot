import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { ChannelType } from 'discord.js';

import { channels } from '$/config';
import { GameState } from '$/managers/game';
import { muToRating } from '$/util/elo';
import { computeRoleChanges } from '$/util/role';
import { DEFAULT_MU, DEFAULT_RATING, sendToScore } from '$/util/score';

export default class RescoreCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Sends a game to be rescored.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.Integer,
				name: 'id',
				description: 'The identification number of the game to rescore',
			})
		);
	}

	public async run(
		source: CommandSource,
		gameId: number
	) {
		const gameShell = await prisma.game.findUniqueOrThrow({
			where: {
				id: gameId,
			},
			select: {
				modeId: true,
				id: true,
				state: true,
			},
		});

		if (gameShell.state !== GameState.POST_GAME)
			throw `Game \`#${gameId}\` is not in the post-game state.`;

		const scoring = this.client.channels.cache.get(channels.scoring.channelId);
		if (!scoring || scoring.type !== ChannelType.GuildText)
			throw 'The scoring channel has not been set up. Please try again later.';

		const roleChangePromises: Promise<unknown>[] = [];

		const game = await prisma.$transaction(async tx => {
			const game = await tx.game.update({
				where: {
					id: gameId,
				},
				data: {
					state: GameState.SCORING,
				},
				select: {
					id: true,
					state: true,
					modeId: true,
					users: {
						select: {
							team: true,
							index: true,
							gameId: true,
							userId: true,
							rv: true,
							mu: true,
							phi: true,
							user: {
								select: {
									discordId: true,
									profiles: {
										where: {
											modeId: gameShell.modeId,
										},
										select: {
											mu: true,
											rating: true,
										},
									},
								},
							},
						},
					},
					proof: true,
					mode: true,
					startedAt: true,
					endedAt: true,
					textChannelId: true,
					guildId: true,
					voiceChannelIds: true,
					winner: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			await tx.gameUser.updateMany({
				where: {
					gameId: game.id,
				},
				data: {
					rv: null,
					phi: null,
					mu: null,
				},
			});

			for (const user of game.users) {
				if (user.rv === null || user.mu === null || user.phi === null) continue;

				const profile = user.user.profiles[0] ?? {
					mu: DEFAULT_MU,
					rating: DEFAULT_RATING,
				};

				const newRating = muToRating(profile.mu - user.mu);

				await tx.profile.update({
					where: {
						modeId_userId: {
							modeId: game.modeId,
							userId: user.userId,
						},
					},
					data: {
						rv: {
							decrement: user.rv,
						},
						phi: {
							decrement: user.phi,
						},
						mu: {
							decrement: user.mu,
						},
						rating: newRating,
						wins: game.winner === user.team ? {
							decrement: 1,
						} : undefined,
						losses: game.winner === user.team || game.winner === null ? undefined : {
							decrement: 1,
						},
					},
				});

				roleChangePromises.push(computeRoleChanges(game.guildId, game.modeId, profile.rating, newRating).then(async roles => {
					for (const role of roles.add) {
						await source.guild.members.addRole({
							user: user.user.discordId,
							role: role.roleId,
						});
					}

					for (const role of roles.remove) {
						await source.guild.members.removeRole({
							user: user.user.discordId,
							role: role.roleId,
						});
					}
				}));
			}

			return game;
		});

		await Promise.allSettled(roleChangePromises);
		await sendToScore(scoring, source, game);

		return `Game \`#${gameId}\` has been sent to be rescored.`;
	}

	public async catch(_: Error, __: CommandSource, gameId: number) {
		throw `Game \`#${gameId}\` not found.`;
	}
}

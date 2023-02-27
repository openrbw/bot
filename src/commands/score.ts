import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
	EventHandler,
	message,
} from '@matteopolak/framecord';
import { channels } from 'config';
import { prisma } from 'database';
import { Attachment, ChannelType, Interaction } from 'discord.js';

import { GameManager } from '$/managers/game';
import { createTeamButtons } from '$/util/components';
import { computeEloChange, GameResult } from '$/util/elo';
import { iter } from '$/util/iter';
import { playersToFields } from '$/util/message';

export default class ScoreCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Sends a game to be scored.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.Attachment,
				name: 'proof',
				description: 'A screenshot of the game results',
			})
		);
	}

	public async run(source: CommandSource, proof: Attachment) {
		const game = await prisma.game.findFirst({
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

		if (game === null) throw 'This command can only be run in a game channel.';
		if (game.state.index !== 0)
			throw 'You can only score the game after it has started.';

		const scoring = this.client.channels.cache.get(channels.scoring.channelId);
		if (!scoring || scoring.type !== ChannelType.GuildText)
			throw 'The scoring channel has not been set up. Please try again later.';

		await prisma.game.update({
			where: {
				id: game.id,
			},
			data: {
				stateId: 2,
			},
		});

		message(scoring, {
			embeds: embed({
				title: `Game \`#${game.id}\``,
				description: `Submitted by ${source.user}`,
				fields: playersToFields(game.users),
				image: {
					url: proof.url,
				},
			}).embeds,
			components: createTeamButtons(game.mode.teams, game.id),
		});

		return void GameManager.close(
			game,
			source.guild,
			source.channel!,
			'The game has been sent to be scored.'
		);
	}

	private async getModeFromGameId(gameId: number) {
		const game = await prisma.game.findFirst({
			where: {
				id: gameId,
			},
			select: {
				mode: true,
			},
		});

		return game?.mode ?? null;
	}

	@EventHandler()
	public async interactionCreate(interaction: Interaction) {
		if (!interaction.isButton()) return;

		const [key, gameIdString, teamIndexString] =
			interaction.customId.split('.');
		if (key !== 'team') return;

		const teamIndex = parseInt(teamIndexString);
		const gameId = parseInt(gameIdString);

		const mode = await this.getModeFromGameId(gameId);
		if (mode === null) return;

		const game = await prisma.game.findFirst({
			where: {
				id: gameId,
			},
			include: {
				users: {
					include: {
						user: {
							include: {
								profiles: {
									where: {
										modeId: mode.id,
									},
								},
							},
						},
					},
				},
			},
		});

		if (game === null) return;

		const scores = await computeEloChange(game.users, mode, GameResult.WIN, teamIndex);

		await prisma.$transaction(
			iter(game.users)
				.map(p => {
					const winner = p.team === teamIndex;
					const score = scores.get(p.userId);
					if (!score) return undefined!;

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
							mu: score.mu,
							rv: score.rv,
						},
						create: {
							modeId: game.modeId,
							userId: p.userId,
							[winner ? 'wins' : 'losses']: 1,
							[winner ? 'winstreak' : 'losestreak']: 1,
							phi: score.phi,
							mu: score.mu,
							rv: score.rv,
						},
					});
				})
				.filter(p => p !== undefined)
				.toArray()
		);

		await interaction.message.delete();
	}
}

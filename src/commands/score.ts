import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import { channels } from 'config';
import { prisma } from 'database';
import { Attachment, ChannelType, Interaction } from 'discord.js';

import { connectors, GameManager, GameState } from '$/managers/game';
import { GameResult } from '$/util/elo';
import { scoreGame, sendToScore } from '$/util/score';

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
				mode: true,
			},
		});

		if (game === null) throw 'This command can only be run in a game channel.';
		if (game.state < GameState.ACTIVE)
			throw 'You can only score the game after it has started.';

		const scoring = this.client.channels.cache.get(channels.scoring.channelId);
		if (!scoring || scoring.type !== ChannelType.GuildText)
			throw 'The scoring channel has not been set up. Please try again later.';

		game.proof = proof.url;

		const connector = game.mode.connector ? connectors.get(game.mode.connector) : null;
		const result = await connector?.score(game);

		if (result) {
			await scoreGame(source.guild, result.game, GameResult.WIN, result.winner, result);

			return void GameManager.close(
				game,
				source.guild,
				source.channel!,
				'The game has been automatically scored.'
			);
		} else {
			await prisma.game.update({
				where: {
					id: game.id,
				},
				data: {
					state: GameState.SCORING,
					proof: proof.url,
				},
			});
		}

		await sendToScore(scoring, source, game);

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
		if (!interaction.isButton() || interaction.guild === null) return;

		const [key, gameIdString, teamIndexString] =
			interaction.customId.split('.');

		const isTie = key === 'tie';
		if (!isTie && key !== 'team') return;

		const teamIndex = isTie ? 0 : parseInt(teamIndexString);
		const gameId = parseInt(gameIdString);

		const mode = await this.getModeFromGameId(gameId);
		if (mode === null) return;

		const game = await prisma.game.findFirst({
			where: {
				id: gameId,
			},
			include: {
				mode: true,
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

		if (game !== null) {
			if (isTie)
				await scoreGame(interaction.guild, game, GameResult.TIE);
			else await scoreGame(interaction.guild, game, GameResult.WIN, teamIndex);
		}

		await interaction.message.delete();
	}
}

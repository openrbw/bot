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

	@EventHandler()
	public async interactionCreate(interaction: Interaction) {
		if (!interaction.isButton()) return;

		const [key, gameIdString, teamIndexString] =
			interaction.customId.split('.');
		if (key !== 'team') return;

		const teamIndex = parseInt(teamIndexString);
		const gameId = parseInt(gameIdString);

		const game = await prisma.game.findFirst({
			where: {
				id: gameId,
			},
			include: {
				users: true,
			},
		});

		if (game === null) return;

		await prisma.$transaction(
			iter(game.users)
				.map(p => {
					const winner = p.team === teamIndex;

					return prisma.profile.upsert({
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
				.toArray()
		);

		await interaction.message.delete();
	}
}

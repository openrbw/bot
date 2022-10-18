import { GameManager } from '@managers/game';
import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { playersToFields } from '@util/message';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class PickCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'player',
				description: 'The player you want to pick',
				required: true,
			}),
		);
	}

	public async run(source: CommandSource, user: User) {
		const game = await prisma.game.findFirst({
			where: {
				textChannelId: source.channelId,
			},
			include: {
				players: true,
			},
		});

		if (game === null) throw 'This command can only be run in a game channel.';
		if (!game.captains.includes(source.user.id))
			throw 'You must be a captain in order to run this command.';

		const index = GameManager.calculateNextPick(game.lastPickIndex, game);

		if (game.captains[index] !== source.user.id)
			throw `It is currently <@${game.captains[index]}>'s turn to pick.`;

		const pickIndex = game.remainingIds.indexOf(user.id);
		if (pickIndex === -1) throw `${user} cannot be picked.`;

		game.remainingIds.splice(pickIndex, 1);

		await prisma.game.update({
			where: {
				id: game.id,
			},
			data: {
				lastPickIndex: index,
				remainingIds: {
					set: game.remainingIds,
				},
				players: {
					create: {
						userId: user.id,
						team: index,
					},
				},
			},
		});

		game.players.push({
			userId: user.id,
			team: index,
			gameId: game.id,
		});

		const nextIndex = GameManager.calculateNextPick(index, game);

		return embed({
			title: `${source.user.tag} has picked ${user.tag}`,
			description: `@<${game.captains[nextIndex]}>, pick a player with \`/pick <user>\`.`,
			fields: playersToFields(game.players),
		});
	}
}

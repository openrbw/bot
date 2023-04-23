import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { inPlaceSort } from 'fast-sort';

import { iter } from '$/util/iter';

export default class GameCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Displays the data of a game.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.Integer,
				name: 'id',
				description: 'The identification number of the game to view',
			})
		);
	}

	public async run(
		_: CommandSource,
		gameId: number
	) {
		const game = await prisma.game.findUniqueOrThrow({
			where: {
				id: gameId,
			},
			select: {
				mode: {
					select: {
						name: true,
					},
				},
				users: {
					select: {
						team: true,
						index: true,
						user: {
							select: {
								discordId: true,
							},
						},
					},
				},
			},
		});

		inPlaceSort(game.users).asc([
			u => u.team,
			u => u.index,
		]);

		return embed({
			title: `Game #${gameId}`,
			description: `Mode: **${game.mode.name}**`,
			fields: iter(game.users).groupBy(u => u.team).map(users => ({
				name: `Team ${users[0].team}`,
				value: users.map(u => `<@${u.user.discordId}>`).join('\n'),
			})).toArray(),
		});
	}

	public async catch(_: Error, __: CommandSource, gameId: number) {
		throw `Game \`#${gameId}\` not found.`;
	}
}

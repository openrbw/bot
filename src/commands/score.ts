import { GameManager } from '@managers/game';
import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
	message,
} from '@matteopolak/framecord';
import { GameState, Map } from '@prisma/client';
import { prisma } from 'database';
import { PermissionsBitField, escapeMarkdown } from 'discord.js';

export default class MapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Scores a game.';
		this.permissions.add(PermissionsBitField.Flags.ManageRoles);

		this.arguments.push(
			new Argument({
				type: ArgumentType.Integer,
				name: 'number',
				description: 'The game number',
				minValue: 0,
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'winner',
				description: 'The winning team',
				minValue: 1,
				mapper: t => t - 1,
			}),
		);
	}

	public async run(source: CommandSource, gameId: number, winnerIndex: number) {
		const game = await prisma.game.findFirst({
			where: {
				id: gameId,
				state: GameState.Playing,
			},
			include: {
				players: true,
			},
		});
	}
}

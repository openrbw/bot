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
import { Map } from '@prisma/client';
import { prisma } from 'database';
import { escapeMarkdown } from 'discord.js';

export default class MapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Bans a map during the banning stage';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'map',
				description: 'The name of the map to ban',
				mapper: n =>
					prisma.map.findFirst({
						where: {
							name_lower: n.toLowerCase(),
						},
					}),
				filter: n => n !== null,
				error: 'You did not provide a valid map name.',
			}),
		);
	}

	public async run(source: CommandSource, map: Map) {
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
			throw 'Only captains can ban a map.';

		if (game.captainMapBans.includes(source.user.id))
			throw 'You have already banned a map.';

		if (game.bannedMaps.includes(map.name_lower))
			throw `The map **${escapeMarkdown(map.name)}** has already been banned.`;

		await prisma.game.update({
			where: {
				textChannelId: source.channelId,
			},
			data: {
				bannedMaps: {
					push: map.name_lower,
				},
				captainMapBans: {
					push: source.user.id,
				},
			},
		});

		game.bannedMaps.push(map.name_lower);

		await message(
			source,
			embed({
				description: `You have banned the map **${escapeMarkdown(map.name)}**.`,
			}),
		);

		if (game.captainMapBans.length + 1 === game.captains.length) {
			GameManager.startGame(game, source.channel!);
		}
	}
}

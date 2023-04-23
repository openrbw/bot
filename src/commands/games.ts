import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { User } from 'discord.js';

import { timeToDiscordStamp } from '$/util/time';

export default class ProfileCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Shows the recent games of a player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'player',
				description: 'The player whose games you want to view',
				default: s => s.user,
				required: false,
			})
		);
	}

	public async run(source: CommandSource, user: User = source.user) {
		const games = await prisma.game.findMany({
			where: {
				users: {
					some: {
						user: {
							discordId: user.id,
						},
					},
				},
			},
			orderBy: {
				endedAt: 'desc',
			},
			select: {
				id: true,
				winner: true,
				state: true,
				endedAt: true,
				createdAt: true,
				users: {
					where: {
						user: {
							discordId: user.id,
						},
					},
					select: {
						team: true,
					},
				},
			},
		});

		return embed({
			title: `${user.username}'s recent games`,
			description: games.map(g => {
				const team = g.users[0].team;
				const won = g.winner === team;

				return `\`#${g.id}\`. ${g.endedAt ? 'Ended' : 'Started'} ${timeToDiscordStamp(g.endedAt ?? g.createdAt)}${won ? ' 👑' : ''}`;
			}).join('\n') || 'No games played.',
		});
	}
}

import {
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';

import { muToRating } from '$/util/elo';
import { DEFAULT_MU } from '$/util/score';

export default class QueueStatsCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Shows the stats of everyone in the current game.';
	}

	public async run(source: CommandSource) {
		const game = await prisma.game.findFirst({
			where: {
				textChannelId: source.channelId,
			},
			select: {
				id: true,
				modeId: true,
			},
		});

		if (game === null) throw 'This command can only be run in a game channel.';

		const users = await prisma.game.findUnique({
			where: {
				id: game.id,
			},
			select: {
				users: {
					select: {
						user: {
							select: {
								discordId: true,
								profiles: {
									select: {
										mu: true,
										wins: true,
										losses: true,
									},
									where: {
										modeId: game.modeId,
									},
								},
							},
						},
					},
				},
			},
		});

		return embed({
			title: 'Queue Stats',
			description: users!.users.map(u => {
				const profile = u.user.profiles[0] ?? {
					mu: DEFAULT_MU,
					wins: 0,
					losses: 0,
				};

				return `[\`${muToRating(profile.mu)}\`] <@${u.user.discordId}>: \`${(profile.wins / (profile.losses || 1)).toFixed(2)}\` W/L`;
			}).join('\n') || 'No users in queue.',
		});
	}
}

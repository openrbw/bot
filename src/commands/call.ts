import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { ChannelType, User } from 'discord.js';

export default class LeaderboardCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Adds a spectator to the game.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to call.',
			})
		);
	}

	public async run(
		source: CommandSource,
		user: User
	) {
		const game = await prisma.game.findFirst({
			where: {
				textChannelId: source.channelId,
				users: {
					some: {
						user: {
							discordId: source.user.id,
						},
					},
				},
			},
			select: {
				voiceChannelIds: true,
			},
		});

		if (game === null || source.channel === null || source.channel.isThread()) throw 'This command can only be run in a game channel in which you are participating.';

		await source.channel.permissionOverwrites.edit(user, {
			ViewChannel: true,
		});

		for (const voiceId of game.voiceChannelIds) {
			const voice = source.channel.guild.channels.cache.get(voiceId);

			if (voice && voice.type === ChannelType.GuildVoice) {
				await voice.permissionOverwrites.edit(user, {
					ViewChannel: true,
				});
			}
		}

		return `Called ${user} to the game.`;
	}
}

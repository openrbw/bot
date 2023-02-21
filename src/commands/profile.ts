import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { User } from 'discord.js';

export default class ProfileCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Shows the profile of a player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'player',
				description: 'The player whose profile you want to view',
				default: s => s.user,
				required: false,
			}),
			new Argument({
				type: ArgumentType.String,
				name: 'mode',
				description: 'The mode of the profile to view',
				required: false,
				mapper: n => prisma.mode.findFirst({
					where: {
						nameLower: n.toLowerCase(),
					},
				}),
				filter: m => m !== null,
				error: 'Invalid mode provided.',
			})
		);
	}

	public async run(source: CommandSource, user: User, mode: Mode) {
		const profile = await prisma.profile.findFirst({
			where: {
				user: {
					discordId: user.id,
				},
				modeId: mode.id,
			},
		});

		if (profile === null)
			throw `${user} has not played \`${mode.name}\` yet.`;

		return embed({
			author: {
				name: `${user.tag}'s ${mode} Profile`,
				icon_url: user.displayAvatarURL(),
			},
			thumbnail: {
				url: user.displayAvatarURL(),
			},
			fields: [
				{
					name: 'Wins',
					value: profile.wins.toString(),
					inline: true,
				},
				{
					name: 'Losses',
					value: profile.losses.toString(),
					inline: true,
				},
				{
					name: 'W/L',
					value: (profile.wins / (profile.losses || 1)).toFixed(2),
					inline: true,
				},
			],
		});
	}
}

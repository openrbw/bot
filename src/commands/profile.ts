import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
	EventHandler,
} from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { Events, Interaction, User } from 'discord.js';

export default class ProfileCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Shows the profile of a player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'mode',
				description: 'The mode of the profile to view',
				required: true,
				mapper: async n => await prisma.mode.findFirst({
					where: {
						nameLower: n.toLowerCase(),
					},
				}),
				filter: m => m !== null,
				error: 'Invalid mode provided.',
				autocomplete: true,
			}),
			new Argument({
				type: ArgumentType.User,
				name: 'player',
				description: 'The player whose profile you want to view',
				default: s => s.user,
				required: false,
			})
		);
	}

	@EventHandler()
	public async [Events.InteractionCreate](interaction: Interaction) {
		if (!interaction.isAutocomplete()) return;
		if (!this.is(interaction)) return;

		const name = interaction.options.getString('mode', true).toLowerCase();
		const modes = await prisma.mode.findMany({
			where: {
				nameLower: {
					contains: name,
				},
			},
			select: {
				name: true,
			},
			take: 25,
		});

		if (modes.length) return interaction.respond(modes.map(m => ({ name: m.name, value: m.name })));

		const defaultModes = await prisma.mode.findMany({
			orderBy: {
				name: 'asc',
			},
			select: {
				name: true,
			},
			take: 25,
		});

		return interaction.respond(defaultModes.map(m => ({ name: m.name, value: m.name })));
	}

	public async run(source: CommandSource, mode: Mode, user: User = source.user) {
		const profile = await prisma.profile.findFirst({
			where: {
				user: {
					discordId: user.id,
				},
				modeId: mode.id,
			},
		}) ?? {
			wins: 0,
			losses: 0,
			mvps: 0,
			rating: 400,
			winstreak: 0,
			losestreak: 0,
		};

		return embed({
			author: {
				name: `${user.tag}'s ${mode.displayName ?? mode.name} Profile`,
				icon_url: user.displayAvatarURL(),
			},
			fields: [
				{
					name: 'Rating',
					value: profile.rating.toString(),
					inline: true,
				},
				{
					name: 'W/L',
					value: (profile.wins / (profile.losses || 1)).toFixed(2),
					inline: true,
				},
				{
					name: 'MVPs',
					value: profile.mvps.toString(),
					inline: true,
				},
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
				profile.losestreak > 0 ? {
					name: 'Lose Streak',
					value: profile.losestreak.toString(),
					inline: true,
				} : {
					name: 'Win Streak',
					value: profile.winstreak.toString(),
					inline: true,
				},
			],
		});
	}
}

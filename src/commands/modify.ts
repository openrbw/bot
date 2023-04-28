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
import { Events, Interaction, PermissionFlagsBits, User } from 'discord.js';

import { PROPERTIES, PROPERTIES_HUMAN } from '$/constants';

export default class ModifyCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Modifies profile data of a player.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'player',
				description: 'The player whose profile you want to modify',
			}),
			new Argument({
				type: ArgumentType.String,
				name: 'mode',
				description: 'The mode of the profile to modify',
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
				type: ArgumentType.Integer,
				name: 'property',
				description: 'The property to sort by',
				choices: [
					{
						name: 'Rating',
						value: 0,
					},
					{
						name: 'Wins',
						value: 1,
					},
					{
						name: 'MVPs',
						value: 2,
					},
					{
						name: 'Losses',
						value: 3,
					},
					{
						name: 'Win Streak',
						value: 4,
					},
					{
						name: 'Lose Streak',
						value: 5,
					},
				],
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'change',
				description: 'The value to change the property by',
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

	public async run(_source: CommandSource, user: User, mode: Mode, propertyId: number, change: number) {
		const property = PROPERTIES[propertyId];

		const updated = await prisma.profile.updateMany({
			where: {
				user: {
					discordId: user.id,
				},
				modeId: mode.id,
				[property]: change < 0 ? {
					gt: -change,
				} : undefined,
			},
			data: {
				[property]: {
					increment: change,
				},
			},
		});

		if (updated.count === 0) {
			if (change < 0) throw `${user} does not have a profile for \`${mode.name}\` with \`${PROPERTIES_HUMAN[propertyId]}\` ≥ ${-change}.`;
			else throw `${user} does not have a profile for \`${mode.name}\`.`;
		}

		return embed({
			title: 'Profile Modified',
			description: `${user} has had their \`${PROPERTIES_HUMAN[propertyId]}\` for \`${mode.name}\` modified by \`${change}\`.`,
		});
	}
}

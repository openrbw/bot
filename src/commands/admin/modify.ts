import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { Events, Interaction, PermissionFlagsBits, User } from 'discord.js';

const PROPERTIES = ['rating', 'wins', 'losses', 'mvps', 'winstreak', 'losestreak'] as const;

export default class ModifyCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);
		this.description = 'Modifies the profile data of a player.';
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
				description: 'The property to modify',
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
						name: 'Losses',
						value: 2,
					},
					{
						name: 'MVPs',
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
				name: 'direction',
				description: 'Whether to add or remove',
				choices: [
					{
						name: 'Add',
						value: 1,
					},
					{
						name: 'Remove',
						value: -1,
					},
				],
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'amount',
				description: 'The amount to add or remove',
				minValue: 1,
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

	public async run(source: CommandSource, user: User, mode: Mode, property: number, direction: number, amount: number) {
		const result = await prisma.profile.updateMany({
			where: {
				user: {
					discordId: user.id,
				},
				modeId: mode.id,
			},
			data: {
				[PROPERTIES[property]]: {
					increment: direction * amount,
				},
			},
		});

		if (result.count === 0) {
			await prisma.profile.create({
				data: {
					user: {
						connectOrCreate: {
							where: {
								discordId: user.id,
							},
							create: {
								discordId: user.id,
							},
						},
					},
					mode: {
						connect: {
							id: mode.id,
						},
					},
				},
			});
		}

		return `Successfully modified ${user}'s \`${mode.name}\` profile.`;
	}
}

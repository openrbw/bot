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
import { Events, Interaction, PermissionFlagsBits, Role } from 'discord.js';

export default class CreateRoleCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Creates a new rating role.';
		this.arguments.push(
			new Argument({
				name: 'role',
				description: 'The role to use',
				type: ArgumentType.Role,
			}),
			new Argument({
				type: ArgumentType.String,
				name: 'mode',
				description: 'The mode to apply the role to',
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
				name: 'rating_min',
				description: 'The minimum rating threshold for the role',
				type: ArgumentType.Integer,
				minValue: 0,
			}),
			new Argument({
				name: 'rating_max',
				description: 'The maximum rating threshold for the role',
				type: ArgumentType.Integer,
				minValue: 0,
				required: false,
			})
		);
	}

	@EventHandler()
	public async [Events.InteractionCreate](interaction: Interaction) {
		if (!interaction.isAutocomplete()) return;
		if (!this.is(interaction)) return;

		const modes = await prisma.mode.findMany({
			where: {
				nameLower: {
					contains: interaction.options.getString('mode', true).toLowerCase(),
				},
			},
			select: {
				name: true,
			},
			take: 25,
		});

		if (modes.length) {
			return interaction.respond(modes.map(m => ({
				name: m.name,
				value: m.name,
			})));
		}

		const defaultModes = await prisma.mode.findMany({
			orderBy: {
				name: 'asc',
			},
			select: {
				id: true,
				name: true,
			},
			take: 25,
		});

		return interaction.respond(defaultModes.map(m => ({
			name: m.name,
			value: m.name,
		})));
	}

	public async run(source: CommandSource, role: Role, mode: Mode, ratingMin: number, ratingMax?: number) {
		await prisma.role.create({
			data: {
				guildId: source.guild.id,
				roleId: role.id,
				ratingMin,
				ratingMax,
				modeId: mode.id,
			},
		});

		if (ratingMax)
			return `Created role ${role} with rating range \`${ratingMin}\`-\`${ratingMax}\`.`;
		else
			return `Created role ${role} with rating range \`${ratingMin}+\`.`;
	}

	public async catch(_: Error, __: CommandSource, role: Role) {
		throw `The role ${role} is already a rating role, use \`/admin role edit\`.`;
	}
}

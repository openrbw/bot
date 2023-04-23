import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits, Role } from 'discord.js';

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
			})
		);
	}

	public async run(source: CommandSource, role: Role, ratingMin: number, ratingMax: number) {
		await prisma.role.create({
			data: {
				guildId: source.guild.id,
				roleId: role.id,
				ratingMin,
				ratingMax,
			},
		});

		return `Created role ${role} with rating range \`${ratingMin}\`-\`${ratingMax}\`.`;
	}

	public async catch(_: Error, __: CommandSource, role: Role) {
		throw `The role ${role} is already a rating role, use \`/admin role edit\`.`;
	}
}

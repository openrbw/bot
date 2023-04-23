import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits, Role } from 'discord.js';

export default class EditRoleCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Edits an existing rating role.';
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
				required: false,
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

	public async run(source: CommandSource, role: Role, ratingMin?: number, ratingMax?: number) {
		const dbRole = await prisma.role.update({
			where: {
				guildId_roleId: {
					guildId: source.guild.id,
					roleId: role.id,
				},
			},
			data: {
				ratingMin,
				ratingMax,
			},
		});

		return `Edited role ${role} with rating range \`${dbRole.ratingMin}\`-\`${dbRole.ratingMax}\`.`;
	}

	public async catch(_: Error, __: CommandSource, role: Role) {
		throw `The role ${role} is not a rating role.`;
	}
}

import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits, Role } from 'discord.js';

export default class DeleteRoleCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Deletes an existing rating role.';
		this.arguments.push(
			new Argument({
				name: 'role',
				description: 'The role to delete',
				type: ArgumentType.Role,
			})
		);
	}

	public async run(source: CommandSource, role: Role) {
		const dbRole = await prisma.role.delete({
			where: {
				guildId_roleId: {
					guildId: source.guild.id,
					roleId: role.id,
				},
			},
		});

		return `Deleted role ${role} with rating range \`${dbRole.ratingMin}\`-\`${dbRole.ratingMax}\`.`;
	}

	public async catch(_: Error, __: CommandSource, role: Role) {
		throw `The role ${role} is not a rating role.`;
	}

	@EventHandler()
	public async roleDelete(role: Role) {
		await prisma.role.deleteMany({
			where: {
				guildId: role.guild.id,
				roleId: role.id,
			},
		});
	}

	@EventHandler()
	public async ready() {
		const roles = await prisma.role.findMany({
			select: {
				roleId: true,
				guildId: true,
			},
		});

		const filterIds: string[] = [];

		for (const role of roles) {
			const guild = this.client.guilds.cache.get(role.guildId);

			if (!guild) {
				filterIds.push(role.roleId);
				continue;
			}

			if (!guild.roles.cache.has(role.roleId)) {
				filterIds.push(role.roleId);
			}
		}

		await prisma.role.deleteMany({
			where: {
				roleId: {
					in: filterIds,
				},
			},
		});
	}
}

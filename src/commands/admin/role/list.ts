import {
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

export default class ListRoleCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Lists all rating roles.';
	}

	public async run(source: CommandSource) {
		const roles = await prisma.role.findMany({
			where: {
				guildId: source.guild.id,
			},
			orderBy: {
				ratingMin: 'asc',
			},
		});

		return embed({
			title: `Rating roles (${roles.length})`,
			description: roles.map(r => `<@&${r.roleId}> \`${r.ratingMin}\`-\`${r.ratingMax}\``).join('\n'),
		});
	}
}

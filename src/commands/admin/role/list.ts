import {
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

import { iter } from '$/util/iter';

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
			select: {
				roleId: true,
				ratingMin: true,
				ratingMax: true,
				mode: {
					select: {
						name: true,
						id: true,
					},
				},
			},
		});

		return embed({
			title: `Rating roles (${roles.length})`,
			fields: iter(roles).groupBy(r => r.mode.id).map(roles => ({
				name: roles[0].mode.name,
				value: roles.map(r => `<@&${r.roleId}> (\`${r.ratingMin}${r.ratingMax === null ? '' : `\`-\`${r.ratingMax}`}\`)`).join('\n'),
			})).toArray(),
		});
	}
}

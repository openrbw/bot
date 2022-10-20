import { Command, CommandOptions, embed } from '@matteopolak/framecord';
import { iter } from '@util/iter';
import { prisma } from 'database';
import { PermissionFlagsBits } from 'discord.js';

export default class ListMapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Lists all of the maps';
	}

	public async run() {
		const maps = await prisma.map.findMany({});

		const [enabled, disabled] = iter(maps).partition(m => m.enabled);

		return embed({
			title: `Maps (${maps.length})`,
			description:
				enabled.map(m => `\`${m.name}\``).join(', ') ||
				'There are currently no maps. Add one with `/admin map create`.',
			fields:
				disabled.length > 0
					? [
							{
								name: 'Disabled',
								value: disabled.map(m => `\`${m.name}\``).join(', '),
							},
					  ]
					: undefined,
		});
	}
}

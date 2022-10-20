import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
} from '@matteopolak/framecord';
import { prisma } from 'database';
import { Attachment, PermissionFlagsBits } from 'discord.js';

export default class CreateMapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionFlagsBits.ManageGuild);

		this.description = 'Creates a new map.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'name',
				description: 'The name of the map',
				maxLength: 32,
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'height',
				description: 'The height of the map in in-game blocks',
				minValue: 0,
				maxValue: 255,
			}),
			new Argument({
				type: ArgumentType.Attachment,
				name: 'image',
				description: 'An image of the map',
			}),
		);
	}

	public async run(
		_: CommandSource,
		name: string,
		height: number,
		attachment: Attachment,
	) {
		await prisma.map.upsert({
			where: {
				name_lower: name.toLowerCase(),
			},
			update: {
				name: name,
				url: attachment.url,
				height,
			},
			create: {
				name_lower: name.toLowerCase(),
				name: name,
				url: attachment.url,
				height,
			},
		});

		return embed({
			title: `Map created: ${name}`,
			image: {
				url: attachment.url,
			},
		});
	}
}

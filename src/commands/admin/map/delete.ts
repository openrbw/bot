import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { prisma } from 'database';

export default class DeleteMapCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'name',
				description: 'The name of the map',
				maxLength: 32,
			}),
		);
	}

	public async run(_: CommandSource, name: string) {
		const map = await prisma.map.deleteMany({
			where: {
				name_lower: name.toLowerCase(),
			},
		});

		if (map.count === 0)
			throw `A map by the name of \`${name}\` does not exist.`;

		return `Deleted the map by the name of \`${name}\`.`;
	}
}

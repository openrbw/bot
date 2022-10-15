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

export default class Test extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				required: true,
				name: 'username',
				description: 'Your username for Minecraft: Java Edition',
				minLength: 1,
				maxLength: 16,
			}),
		);
	}

	@EventHandler({ once: true })
	public async ready() {
		console.log('hello world');
	}

	public async run(source: CommandSource, username: string) {
		const user = await prisma.user.upsert({
			where: {
				discordId: source.user.id,
			},
			update: {
				username,
				profiles: {
					upsert: {
						where: {
							mode_userId: {
								mode: Mode.Open,
								userId: '?????', // what goes here?
							},
						},
						create: {
							mode: Mode.Open,
						},
						update: {
							wins: {
								increment: 1,
							},
						},
					},
				},
			},
			create: {
				discordId: source.user.id,
				uuid: '',
				username,
			},
		});

		console.log(user);

		return 'good?';
	}
}

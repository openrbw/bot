import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandResponse,
	CommandSource,
	EventHandler,
} from '@matteopolak/framecord';
import {
	AuthCodeResponse,
	AuthResponseSuccess,
	getPlayerData,
} from '@providers/mcoauth';
import { prisma } from 'database';
import { escapeMarkdown } from 'discord.js';

export default class Register extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.arguments.push(
			new Argument({
				type: ArgumentType.Integer,
				required: true,
				name: 'code',
				description: 'Your code from auth.mc-oauth.com',
				minValue: 100000,
				maxValue: 999999,
				mapper: (_, code) => getPlayerData(code),
				filter: (_, response) => response.success,
				error: 'You did not provide a valid authentication code.',
			}),
		);
	}

	@EventHandler({ once: true })
	public async ready() {
		console.log('hello world');
	}

	public async run(
		source: CommandSource,
		response: AuthResponseSuccess<AuthCodeResponse>,
	): CommandResponse {
		await prisma.user.upsert({
			where: {
				id: source.user.id,
			},
			update: {
				username: response.ign,
				uuid: response.uuid,
			},
			create: {
				id: source.user.id,
				uuid: response.uuid,
				username: response.ign,
			},
		});

		return `You have successfully registered with the username **${escapeMarkdown(
			response.ign,
		)}**.`;
	}

	public async catch(
		error: Error,
		source: CommandSource,
		response: AuthResponseSuccess<AuthCodeResponse>,
	): CommandResponse {
		throw `The username **${escapeMarkdown(response.ign)}** is already taken.`;
	}
}

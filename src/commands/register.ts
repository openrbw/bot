import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandResponse,
	CommandSource,
} from '@matteopolak/framecord';
import {
	AuthCodeResponse,
	AuthResponseSuccess,
	getPlayerData,
} from '@providers/mcoauth';
import { prisma } from 'database';
import { escapeMarkdown } from 'discord.js';

export default class RegisterCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Links your Discord account with a Minecraft account.';
		this.arguments.push(
			new Argument({
				name: 'code',
				description: 'Your code from auth.mc-oauth.com',
				type: ArgumentType.Integer,
				minValue: 100000,
				maxValue: 999999,
				mapper: getPlayerData,
				filter: response => response.success,
				error: 'You did not provide a valid authentication code.',
			}),
		);
	}

	public async run(
		source: CommandSource,
		response: AuthResponseSuccess<AuthCodeResponse>,
	): CommandResponse {
		const user = await prisma.user.upsert({
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
				party: {
					create: {
						leaderId: source.user.id,
					},
				},
			},
		});

		return `You have successfully registered with the username **${escapeMarkdown(
			user.username,
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

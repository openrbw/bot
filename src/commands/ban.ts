import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
} from '@matteopolak/framecord';
import { parseTimeString } from '@util/time';
import { prisma } from 'database';
import { PermissionsBitField, User } from 'discord.js';

export default class BanCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.permissions.add(PermissionsBitField.Flags.ManageRoles);

		this.description = 'Bans a player from queueing.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.User,
				name: 'user',
				description: 'The user to ban',
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'duration',
				description: 'The amount of time to ban the user for',
				choices: [
					{
						name: '1 hour',
						value: 1_000 * 60 * 60,
					},
					{
						name: '3 hours',
						value: 1_000 * 60 * 60 * 3,
					},
					{
						name: '6 hours',
						value: 1_000 * 60 * 60 * 6,
					},
					{
						name: '12 hours',
						value: 1_000 * 60 * 60 * 12,
					},
					{
						name: '1 day',
						value: 1_000 * 60 * 60 * 24,
					},
					{
						name: '1 week',
						value: 1_000 * 60 * 60 * 24 * 7,
					},
					{
						name: '1 month (30 days)',
						value: 1_000 * 60 * 60 * 24 * 30,
					},
					{
						name: '1 year',
						value: 1_000 * 60 * 60 * 24 * 365,
					},
					{
						name: 'Forever',
						value: 0,
					},
				],
				required: false,
			}),
			new Argument({
				type: ArgumentType.String,
				name: 'custom',
				description:
					'A custom amount of time to ban for. Format: 1s 1m 1h 1d 1w 1mo 1y',
				mapper: parseTimeString,
				ignoreIfDefined: -1,
				required: false,
				default: 0,
			}),
			new Argument({
				type: ArgumentType.Boolean,
				name: 'overwrite',
				description:
					"If true (default), the user's ban will be replaced with this one.",
				default: true,
				required: false,
			}),
		);
	}

	public async run(
		source: CommandSource,
		user: User,
		duration: number,
		overwrite: boolean,
	) {
		const updated = await prisma.user.update({
			where: {
				id: user.id,
			},
			data: {
				bannedUntil: {
					[overwrite ? 'set' : 'increment']: overwrite
						? Date.now() + duration
						: duration,
				},
			},
		});

		return `${user}'s ban will expire <t:${updated.bannedUntil! / 1_000n}:R>`;
	}

	public async catch(error: Error, source: CommandSource, user: User) {
		throw `${user} is not registered so they cannot be banned.`;
	}
}

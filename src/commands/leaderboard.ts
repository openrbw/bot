import {
	Argument,
	ArgumentType,
	Command,
	CommandOptions,
	CommandSource,
	embed,
	EventHandler,
} from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, Interaction } from 'discord.js';

const PROPERTIES = ['rating', 'wins', 'mvps', 'losses', 'winstreak', 'losestreak'] as const;
const PROPERTIES_HUMAN = ['Rating', 'Wins', 'MVPs', 'Losses', 'Win Streak', 'Lose Streak'] as const;
const MEDALS = ['🥇', '🥈', '🥉'] as const;

export default class LeaderboardCommand extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Displays the leaderboard of a mode.';
		this.arguments.push(
			new Argument({
				type: ArgumentType.String,
				name: 'mode',
				description: 'The mode of the leaderboard to view',
				required: true,
				mapper: async n => await prisma.mode.findFirst({
					where: {
						nameLower: n.toLowerCase(),
					},
				}),
				filter: m => m !== null,
				error: 'Invalid mode provided.',
				autocomplete: true,
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'property',
				description: 'The property to sort by',
				required: false,
				default: 0,
				choices: [
					{
						name: 'Rating',
						value: 0,
					},
					{
						name: 'Wins',
						value: 1,
					},
					{
						name: 'MVPs',
						value: 2,
					},
					{
						name: 'Losses',
						value: 3,
					},
					{
						name: 'Win Streak',
						value: 4,
					},
					{
						name: 'Lose Streak',
						value: 5,
					},
				],
			}),
			new Argument({
				type: ArgumentType.Integer,
				name: 'page',
				description: 'The page of the leaderboard to view',
				required: false,
				default: 1,
				minValue: 1,
			})
		);
	}

	@EventHandler()
	public async [Events.InteractionCreate](interaction: Interaction) {
		if (interaction.isButton()) {
			const [ns, modeId, property, page] = interaction.customId.split('.');
			if (ns !== 'leaderboard') return;

			return interaction.reply(await this.getView(parseInt(modeId), parseInt(property), parseInt(page)));
		}

		if (!interaction.isAutocomplete()) return;
		if (!this.is(interaction)) return;

		const modes = await prisma.mode.findMany({
			where: {
				nameLower: {
					contains: interaction.options.getString('mode', true).toLowerCase(),
				},
			},
			select: {
				name: true,
			},
			take: 25,
		});

		if (modes.length) {
			return interaction.respond(modes.map(m => ({
				name: m.name,
				value: m.name,
			})));
		}

		const defaultModes = await prisma.mode.findMany({
			orderBy: {
				name: 'asc',
			},
			select: {
				id: true,
				name: true,
			},
			take: 25,
		});

		return interaction.respond(defaultModes.map(m => ({
			name: m.name,
			value: m.name,
		})));
	}

	private async getView(modeId: number, property: number, page: number) {
		const key = PROPERTIES[property];

		const mode = await prisma.mode.findFirst({
			where: {
				id: modeId,
			},
			select: {
				name: true,
			},
		});

		const users = await prisma.profile.findMany({
			where: {
				modeId,
			},
			orderBy: [
				{
					[key]: 'desc',
				},
				{
					userId: 'asc',
				},
			],
			select: {
				[key]: true,
				user: {
					select: {
						discordId: true,
					},
				},
			},
			take: 20,
			skip: (page - 1) * 20,
		});

		return {
			embeds: embed({
				title: `${mode?.name ?? '???'} • Leaderboard • ${PROPERTIES_HUMAN[property]}`,
				description: users.map(
					// @ts-expect-error - Prisma does not support dynamic keys
					page === 1 ? (u, i) => `${MEDALS[i] ?? `\`${i + 1}\`.`} <@${u.user.discordId}> (\`${u[key]}\`)`
						// @ts-expect-error - Prisma does not support dynamic keys
						: (u, i) => `\`${i + 1}\`. <@${u.user.discordId}> (\`${u[key]}\`)`
				).join('\n') || 'No users found.',
			}).embeds,
			components: [
				new ActionRowBuilder<ButtonBuilder>({
					components: [
						new ButtonBuilder({
							label: '◄',
							customId: `leaderboard.${modeId}.${property}.${page - 1}`,
							disabled: page === 1,
							style: ButtonStyle.Secondary,
						}),
						new ButtonBuilder({
							label: '►',
							customId: `leaderboard.${modeId}.${property}.${page + 1}`,
							disabled: users.length < 20,
							style: ButtonStyle.Secondary,
						}),
					],
				}),
			],
		};
	}

	public async run(
		_: CommandSource,
		mode: Mode,
		property: number,
		page: number
	) {
		return this.getView(mode.id, property, page);
	}
}

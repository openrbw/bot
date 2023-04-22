import { Client, message } from '@matteopolak/framecord';
import { Game, GameUser, MinecraftUser, Mode, Profile, User as DbUser } from '@prisma/client';
import axios from 'axios';
import { prisma } from 'database';
import { ChannelType, User } from 'discord.js';
import { HypixelAPI } from 'hypixel-api-v2';

import { GameWithPlayers } from '$/managers/game';
import { parse } from '$/ocr/bedwars';
import { channel } from '$/util/forge';
import { iter } from '$/util/iter';

import { Connector, ConnectorUser, GameScoreInput, ScoreResult } from './base';

export type GameScoreMinecraftInput = Game & {
	mode: Mode
	users: (GameUser & {
		user: DbUser & {
			minecraft: MinecraftUser
			profiles: Profile[]
		}
	})[]
}

type AuthResponse = {
	success: false;
} | {
	success: true;
	ign: string;
	uuid: string;
}

const CODE_REGEX = /^\d{6}$/;

export class MinecraftConnector extends Connector {
	public readonly name = 'minecraft';
	private readonly api: HypixelAPI;

	constructor(client: Client) {
		super(client);

		const key = process.env.HYPIXEL_API_KEY;
		if (key === undefined) throw new Error('HYPIXEL_API_KEY is not defined');

		this.api = new HypixelAPI(key);
	}

	public async findOne(discordId: string): Promise<ConnectorUser | null> {
		const user = await prisma.minecraftUser.findFirst({
			where: {
				user: {
					discordId,
				},
			},
			select: {
				id: true,
				username: true,
				uuid: true,
			},
		});

		return user;
	}

	public async findMany(discordIds: string[]): Promise<ConnectorUser[]> {
		const users = await prisma.minecraftUser.findMany({
			where: {
				user: {
					discordId: {
						in: discordIds,
					},
				},
			},
			select: {
				id: true,
				username: true,
				uuid: true,
			},
		});

		return users;
	}

	public async unlink(user: User): Promise<ConnectorUser> {
		try {
			const data = await prisma.$transaction(async t => {
				const dbUser = await t.user.findUnique({
					where: {
						discordId: user.id,
					},
					select: {
						id: true,
					},
				});

				if (dbUser === null) throw 'You are not linked to a Minecraft account';

				return await t.minecraftUser.delete({
					where: {
						userId: dbUser.id,
					},
				});
			});

			return data;
		} catch {
			throw 'You are not linked to a Minecraft account';
		}
	}

	public async verify(user: User, code: string): Promise<ConnectorUser> {
		if (CODE_REGEX.test(code)) {
			// Check linked Hypixel account
			const response = await axios.get<AuthResponse>(`https://api.mc-oauth.com/v1/code/${code}`);

			if (response.data.success) {
				const data = await prisma.minecraftUser.upsert({
					where: {
						uuid: response.data.uuid,
					},
					update: {
						username: response.data.ign,
					},
					create: {
						uuid: response.data.uuid,
						username: response.data.ign,
						user: {
							connectOrCreate: {
								where: {
									discordId: user.id,
								},
								create: {
									discordId: user.id,
								},
							},
						},
					},
					select: {
						id: true,
						username: true,
						uuid: true,
					},
				});

				return data;
			}
		}

		// Check linked Hypixel account
		const player = await this.api.player(code);
		if (player === null || player.socialMedia?.links?.DISCORD !== user.tag) throw 'Could not verify Minecraft account ownership.';

		const data = await prisma.minecraftUser.upsert({
			where: {
				uuid: player.uuid,
			},
			update: {
				username: player.displayname,
			},
			create: {
				uuid: player.uuid,
				username: player.displayname,
				user: {
					connectOrCreate: {
						where: {
							discordId: user.id,
						},
						create: {
							discordId: user.id,
						},
					},
				},
			},
			select: {
				id: true,
				username: true,
				uuid: true,
			},
		});

		return data;
	}

	public async update(discordId: string): Promise<ConnectorUser> {
		const user = await prisma.minecraftUser.findFirst({
			where: {
				user: {
					discordId,
				},
			},
			select: {
				uuid: true,
			},
		});

		if (user === null) throw 'Could not find Minecraft user.';

		const player = await this.api.player(user.uuid);
		if (player === null) throw 'Could not find Minecraft player.';

		return await prisma.minecraftUser.update({
			where: {
				uuid: user.uuid,
			},
			data: {
				username: player.displayname,
			},
			select: {
				id: true,
				username: true,
				uuid: true,
			},
		});
	}

	public async onGameStart(game: GameWithPlayers): Promise<void> {
		// Show command to invite all players to the party.
		const players = await prisma.minecraftUser.findMany({
			where: {
				userId: {
					in: game.users.map(p => p.userId),
				},
			},
		});

		const content = iter(players)
			.map(p => p.username)
			.chunk(4)
			.map(c => `/party ${c.join(' ')}`)
			.toArray()
			.join('\n');

		if (content) {
			await message(
				channel(
					game.textChannelId,
					ChannelType.GuildText,
					this.client.guilds.cache.get(game.guildId)!
				),
				{ content }
			);
		}
	}

	public async score(input: GameScoreInput): Promise<ScoreResult | null> {
		if (input.mode.category !== 'bedwars') return null;

		const game = await prisma.game.findFirst({
			where: {
				id: input.id,
			},
			include: {
				users: {
					include: {
						user: {
							include: {
								minecraft: true,
							},
						},
					},
				},
				mode: true,
			},
		});

		if (game === null || game.users.some(u => u.user.minecraft === null)) return null;

		const result = await parse(game as GameScoreMinecraftInput);

		if (typeof result === 'string') return null;

		return result;
	}
}

import { EventHandler, Handler } from '@matteopolak/framecord';
import { Mode, Party, Profile, User } from '@prisma/client';
import { prisma } from 'database';
import { ChannelType, VoiceState } from 'discord.js';
import { inPlaceSort } from 'fast-sort';

import { GameManager } from '$/managers/game';
import { iter } from '$/util/iter';
import { stdev } from '$/util/math';

export interface QueueList {
	mode: Mode;
	modeId: number;
	guildId: string;
	players: Set<string>;
}

export interface QueueData {
	channelId: string;
}

export const modeAndGuildToQueueList: Map<string, QueueList> = new Map();
export const modeAndGuildToQueueData: Map<string, QueueData[]> = new Map();
export const reservedIds: Set<string> = new Set();

export interface VoiceStateResolvable {
	channelId: string | null;
	id: string;
	guild: {
		id: string;
	};
}

export type PartyWithMemberProfiles = Party & {
	members: (User & {
		profiles: Profile[];
	})[];
};

export type MemberProfile = User & {
	profiles: Profile[];
};

export default class QueueHandler extends Handler {
	private manager: GameManager = new GameManager({ client: this.client });

	public async init() {
		this.client.registerHandler(this.manager);
	}

	/** Validates a group of players */
	private async isSliceValid(
		parties: PartyWithMemberProfiles[],
		config: Mode
	) {
		const teams = Array.from({ length: config.teams }, () => 0);

		for (const party of parties) {
			const index = teams.findIndex(
				n => party.members.length + n <= config.playersPerTeam
			);

			if (index === -1) {
				return false;
			}

			teams[index] += party.members.length;
		}

		return true;
	}

	/** Searches for a game in the specified queue list */
	private async searchForGame(queue: QueueList) {
		const guild = this.client.guilds.cache.get(queue.guildId);
		if (guild === undefined) return;

		const teamSize = queue.mode.playersPerTeam;
		const size = teamSize * queue.mode.teams;

		const discordIdFilter = iter(queue.players)
			.filter(p => !reservedIds.has(p))
			.toArray();

		const parties = await prisma.party.findMany({
			where: {
				members: {
					every: {
						AND: [
							{
								NOT: {
									bannedUntil: 0,
								},
							},
							{
								OR: [
									{
										bannedUntil: {
											equals: null,
										},
									},
									{
										bannedUntil: {
											lt: Date.now(),
										},
									},
								],
							},
							{
								discordId: {
									in: discordIdFilter,
								},
							},
						],
					},
				},
			},
			include: {
				members: {
					include: {
						profiles: {
							where: {
								modeId: {
									equals: queue.modeId,
								},
							},
						},
					},
				},
			},
		});

		const solos = await prisma.user.findMany({
			where: {
				OR: [
					{
						bannedUntil: {
							equals: null,
						},
					},
					{
						bannedUntil: {
							lt: Date.now(),
							not: 0,
						},
					},
				],
				discordId: {
					in: discordIdFilter,
				},
			},
			include: {
				profiles: {
					where: {
						modeId: {
							equals: queue.modeId,
						},
					},
				},
			},
		});

		parties.push(...solos.map(u => ({
			id: u.id,
			leaderId: u.id,
			members: [u],
			createdAt: new Date(),
			updatedAt: new Date(),
		})));

		// Get the party count beforehand so the newly-created parties
		// are not checked
		const rawPartyCount = parties.length;

		for (let i = 0; i < rawPartyCount; ++i) {
			const party = parties[i];

			// If the party is too large, split them up until they are at most
			// the size of one team
			if (party.members.length > teamSize) {
				inPlaceSort(party.members).desc(m => m.profiles[0]?.rating ?? 0);

				while (party.members.length > teamSize) {
					// Remove the first `teamSize` party members from the original party
					const split = party.members.splice(0, teamSize);

					// Then, put them into a new party
					parties.push({
						leaderId: party.leaderId,
						members: split,
						id: party.id,
						createdAt: party.createdAt,
						updatedAt: party.updatedAt,
					});
				}
			}
		}

		const partyCount = parties.length;

		let lowest: PartyWithMemberProfiles[] = [];
		let lowestStdev = Infinity;

		inPlaceSort(parties).desc(
			p =>
				p.members.reduce((a, b) => a + (b.profiles[0]?.rating ?? 0), 0) /
				p.members.length
		);

		for (let i = 0; i <= partyCount; ++i) {
			let players = 0;

			const sliceIndex = parties.findIndex(
				(a, b) => b >= i && (players += a.members.length) === size
			);
			if (sliceIndex === -1) continue;

			const slice = parties.slice(i, sliceIndex + 1);
			const deviation = stdev(
				slice.flatMap(s => s.members.map(m => m.profiles[0]?.rating ?? 0))
			);

			if (queue.mode.maximumStdDev !== -1 && deviation > queue.mode.maximumStdDev) continue;
			if (!this.isSliceValid(slice, queue.mode)) continue;

			if (deviation < lowestStdev) {
				lowest = slice;
				lowestStdev = deviation;
			}
		}

		if (lowest.length === 0) return;

		return GameManager.initializeGame(queue, lowest, guild);
	}

	/** Adds a new player to the queue */
	private async addPlayer(state: VoiceStateResolvable) {
		if (state.channelId === null) return;

		const mode = await prisma.mode.findFirst({
			where: {
				queues: {
					some: {
						channelId: state.channelId,
					},
				},
			},
		});

		if (!mode) return;

		const userId = await prisma.user.findUnique({
			where: {
				discordId: state.id,
			},
			select: {
				id: true,
			},
		});

		const user = await prisma.user.upsert({
			where: {
				discordId: state.id,
			},
			create: {
				discordId: state.id,
				profiles: {
					create: {
						modeId: mode.id,
					},
				},
			},
			update: {
				profiles: {
					upsert: {
						where: {
							modeId_userId: {
								modeId: mode.id,
								userId: userId?.id ?? -1,
							},
						},
						create: {
							modeId: mode.id,
						},
						update: {},
					},
				},
			},
		});

		if (!user) return;
		if (!user.partyId) user.partyId = user.id;

		const key = `${state.guild.id}.${mode}`;
		const queue =
			modeAndGuildToQueueList.get(key) ??
			modeAndGuildToQueueList
				.set(key, {
					mode,
					modeId: mode.id,
					players: new Set(),
					guildId: state.guild.id,
				})
				.get(key)!;

		queue.players.add(user.discordId);

		this.searchForGame(queue);
	}

	/** Removes a player from the queue */
	private async removePlayer(state: VoiceState) {
		if (!state.channelId) return;

		const mode = await prisma.mode.findFirst({
			where: {
				queues: {
					some: {
						channelId: state.channelId,
					},
				},
			},
		});

		if (!mode) return;

		const queue = modeAndGuildToQueueList.get(`${state.guild.id}.${mode}`);

		queue?.players.delete(state.id);
	}

	@EventHandler({ once: true })
	public async ready() {
		// No support for streaming data yet...
		const queues = await prisma.queue.findMany();

		// Update the mode for each active user
		for (const queue of queues) {
			const guild = this.client.guilds.cache.get(queue.guildId);
			const channel = guild?.channels.cache.get(queue.channelId);

			// Delete the queue if it no longer exists or isn't a voice channel
			if (channel?.type !== ChannelType.GuildVoice) {
				await prisma.queue.delete({
					where: {
						id: queue.id,
					},
				});

				continue;
			}

			const key = `${queue.guildId}.${queue.modeId}`;
			const data =
				modeAndGuildToQueueData.get(key) ??
				modeAndGuildToQueueData.set(key, []).get(key)!;

			data.push({ channelId: queue.channelId });

			for (const [, member] of channel.members) {
				this.addPlayer({
					id: member.id,
					channelId: queue.channelId,
					guild: { id: queue.guildId },
				});
			}
		}
	}

	@EventHandler()
	public async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
		if (oldState.channelId === newState.channelId) return;

		if (oldState !== null) {
			this.removePlayer(oldState);
		}

		if (newState !== null) {
			this.addPlayer(newState);
		}
	}
}

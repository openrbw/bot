import { EventHandler, Handler } from '@matteopolak/framecord';
import { Mode, Party, Profile, User } from '@prisma/client';
import { stdev } from '@util/math';
import { GameConfig, gameConfig, queueConfig } from 'config';
import { prisma } from 'database';
import { ChannelType, VoiceState } from 'discord.js';
import { inPlaceSort } from 'fast-sort';
import GameManager from 'managers/game';

export interface QueueList {
	mode: Mode;
	players: Set<string>;
}

export const queueToMode: Map<string, Mode> = new Map();
export const modeAndGuildToQueueList: Map<string, QueueList> = new Map();

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

export default class QueueHandler extends Handler {
	private manager: GameManager = new GameManager(this.client);

	private async isSliceValid(
		parties: PartyWithMemberProfiles[],
		config: GameConfig,
	) {
		const teams = Array.from({ length: config.teams }, () => 0);

		for (const party of parties) {
			const index = teams.findIndex(
				n => party.members.length + n <= config.playersPerTeam,
			);

			if (index === -1) return false;

			teams[index] += party.members.length;
		}

		return true;
	}

	private async searchForGame(queue: QueueList) {
		const parties = await prisma.party.findMany({
			where: {
				members: {
					every: {
						id: {
							in: [...queue.players.keys()],
						},
					},
				},
			},
			include: {
				members: {
					include: {
						profiles: {
							where: {
								mode: {
									equals: queue.mode,
								},
							},
						},
					},
				},
			},
		});

		const partyCount = parties.length;
		const size =
			gameConfig[queue.mode].teams * gameConfig[queue.mode].playersPerTeam;

		let lowest: PartyWithMemberProfiles[] = [];
		let lowestStdev = Infinity;

		for (let i = 0; i <= partyCount; ++i) {
			let players = 0;

			const sliceIndex = parties.findIndex(
				(a, b) => b >= i && (players += a.members.length) === size,
			);
			if (sliceIndex === -1) continue;

			const slice = parties.slice(i, sliceIndex + 1);
			const deviation = stdev(
				slice.flatMap(s => s.members.map(m => m.profiles[0]?.rating ?? 0)),
			);

			if (deviation > queueConfig[queue.mode].maximumStdev) continue;
			if (!this.isSliceValid(slice, gameConfig[queue.mode])) continue;

			if (deviation < lowestStdev) {
				lowest = slice;
				lowestStdev = deviation;
			}
		}

		if (lowest.length === 0) return;

		inPlaceSort(lowest).desc(
			p =>
				p.members.reduce((a, b) => a + (b.profiles[0]?.rating ?? 0), 0) /
				p.members.length,
		);

		return this.manager.createGame(queue, lowest);
	}

	private async addPlayer(state: VoiceStateResolvable) {
		if (state.channelId === null) return;

		const mode = queueToMode.get(state.channelId);
		if (!mode) return;

		const user = await prisma.user.findFirst({
			where: {
				id: state.id,
			},
		});

		if (!user) return;
		if (!user.partyId) user.partyId = user.id;

		const key = `${state.guild.id}.${mode}`;
		const queue = modeAndGuildToQueueList.has(key)
			? modeAndGuildToQueueList.get(key)!
			: modeAndGuildToQueueList
					.set(key, {
						mode,
						players: new Set(),
					})
					.get(key)!;

		queue.players.add(user.id);

		this.searchForGame(queue);
	}

	private async removePlayer(state: VoiceState) {
		const mode = queueToMode.get(state.channelId!);
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
			const channel = guild?.channels.cache.get(queue.id);

			// Delete the queue if it no longer exists or isn't a voice channel
			if (channel?.type !== ChannelType.GuildVoice) {
				await prisma.queue.delete({
					where: {
						id: queue.id,
					},
				});

				continue;
			}

			queueToMode.set(queue.id, queue.mode);

			for (const [, member] of channel.members) {
				this.addPlayer({
					id: member.id,
					channelId: queue.id,
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

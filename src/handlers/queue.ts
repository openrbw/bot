import { EventHandler, Handler } from '@matteopolak/framecord';
import { Mode } from '@prisma/client';
import { prisma } from 'database';
import { ChannelType, Collection, VoiceState } from 'discord.js';

export interface PartyList {
	players: Set<string>;
	id: string;
	sum: number;
}

export interface QueueList {
	mode: Mode;
	parties: Collection<string, PartyList>;
}

export const queueToMode: Map<string, Mode> = new Map();
export const modeAndGuildToQueueList: Map<string, QueueList> = new Map();

export interface Party {
	sum: number;
	players: string[];
}

export default class QueueHandler extends Handler {
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
		}
	}

	@EventHandler()
	public async voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
		if (oldState.channelId === newState.channelId) return;

		const state = newState?.channelId ? newState : oldState;
		const mode = queueToMode.get(state.channelId!);
		if (!mode) return;

		if (oldState !== null) {
			const queue = modeAndGuildToQueueList.get(`${oldState.guild.id}.${mode}`);

			queue?.parties.get(oldState.id)?.players.delete(oldState.id);
			queue?.parties.delete(oldState.id);
		}

		if (newState === null) return;

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
						parties: new Collection(),
					})
					.get(key)!;

		let parent = queue.parties.get(user.partyId);

		if (!parent) {
			parent = {
				players: new Set(),
				id: user.partyId,
				sum: 0,
			};

			queue.parties.set(parent.id, parent);
		}

		parent.players.add(user.id);
		queue.parties.set(user.id, parent);
	}
}

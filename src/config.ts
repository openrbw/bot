import { Mode } from '@prisma/client';

export interface GameConfig {
	teams: number;
	playersPerTeam: number;
	maxPartySize: number;
	teamPickingEnabled: boolean;
}

export interface QueueConfig {
	maximumStdev: number;
}

export const games: Record<Mode, GameConfig> = {
	[Mode.Open]: {
		teams: 2,
		playersPerTeam: 4,
		maxPartySize: 4,
		teamPickingEnabled: true,
	},
	[Mode.Unranked]: {
		teams: 2,
		playersPerTeam: 4,
		maxPartySize: 4,
		teamPickingEnabled: true,
	},
	[Mode.Ranked]: {
		teams: 2,
		playersPerTeam: 4,
		maxPartySize: 4,
		teamPickingEnabled: true,
	},
};

export const queues: Record<Mode, QueueConfig> = {
	[Mode.Open]: {
		maximumStdev: Infinity,
	},
	[Mode.Unranked]: {
		maximumStdev: 5,
	},
	[Mode.Ranked]: {
		maximumStdev: 2,
	},
};

export const channels = {
	scoring: {
		guildId: '968627637444558918',
		channelId: '1015327471102611586',
	},
};

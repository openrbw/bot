export interface QueueConfig {
	maximumStdev: number;
}

export const channels = {
	scoring: {
		guildId: '968627637444558918',
		channelId: '1099136136007393401',
	},
};

export const backend = {
	updateCommand: ['git', ['pull', 'origin', 'main']] as const,
	restartCommand: ['pm2', ['restart', 'main']] as const,
};

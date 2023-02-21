export interface QueueConfig {
	maximumStdev: number;
}

export const channels = {
	scoring: {
		guildId: '968627637444558918',
		channelId: '1015327471102611586',
	},
};

export const backend = {
	updateCommand: ['git', ['pull', 'origin', 'main']] as const,
	restartCommand: ['pm2', ['restart', 'main']] as const,
};

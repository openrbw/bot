import fs from 'node:fs';

function updateFromDisk() {
	try {
		const disk = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

		config = {
			...config,
			...disk,
		};
	} catch (e) {
		console.warn('Failed to update config from disk');
		console.warn(e);
	}
}

updateFromDisk();

export interface QueueConfig {
	maximumStdev: number;
}

export let config = {
	cooldown: 1_000,
	queueEnabled: true,
};

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

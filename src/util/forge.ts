import { Guild } from 'discord.js';

export function forgeMember(guild: Guild, userId: string) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return guild.members._add({ user: { id: userId } }, false);
}

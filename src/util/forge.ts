import { Client, Guild, GuildChannelType } from 'discord.js';

/** Creates a GuildMember */
export function member(userId: string, guild: Guild) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return guild.members._add({ user: { id: userId } }, false);
}

/** Creates a User */
export function user(userId: string, client: Client) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return client.users._add({ id: userId }, false);
}

/** Creates a Channel */
export function channel(
	channelId: string,
	type: GuildChannelType,
	guild: Guild
) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return guild.client.channels._add({ id: channelId, type }, guild, {
		cache: false,
		allowUnknownGuild: true,
	});
}

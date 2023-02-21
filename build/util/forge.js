"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channel = exports.user = exports.member = void 0;
function member(userId, guild) {
    return guild.members._add({ user: { id: userId } }, false);
}
exports.member = member;
function user(userId, client) {
    return client.users._add({ id: userId }, false);
}
exports.user = user;
function channel(channelId, type, guild) {
    return guild.client.channels._add({ id: channelId, type }, guild, {
        cache: false,
        allowUnknownGuild: true,
    });
}
exports.channel = channel;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backend = exports.channels = void 0;
exports.channels = {
    scoring: {
        guildId: '968627637444558918',
        channelId: '1015327471102611586',
    },
};
exports.backend = {
    updateCommand: ['git', ['pull', 'origin', 'main']],
    restartCommand: ['pm2', ['restart', 'main']],
};

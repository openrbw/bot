"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../../database");
const discord_js_1 = require("discord.js");
class DeleteQueueCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionFlagsBits.ManageGuild);
        this.description = 'Deletes an existing queue channel.';
        this.arguments.push(new framecord_1.Argument({
            name: 'channel',
            description: 'The queue channel',
            type: framecord_1.ArgumentType.Channel,
            filter: c => c.type === discord_js_1.ChannelType.GuildVoice,
            error: 'You did not provide a voice channel.',
        }));
    }
    async run(source, channel) {
        const queue = await database_1.prisma.queue.delete({
            where: {
                channelId: channel.id,
            },
            select: {
                mode: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return `Successfully deleted the \`${queue.mode.name}\` queue ${channel}.`;
    }
    async catch() {
        throw 'An error ocurred while trying to delete the queue channel. Please try again later.';
    }
}
exports.default = DeleteQueueCommand;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const framecord_1 = require("@matteopolak/framecord");
const database_1 = require("../../../database");
const discord_js_1 = require("discord.js");
class CreateQueueCommand extends framecord_1.Command {
    constructor(options) {
        super(options);
        this.permissions.add(discord_js_1.PermissionFlagsBits.ManageGuild);
        this.description = 'Creates a new queue channel.';
        this.arguments.push(new framecord_1.Argument({
            name: 'name',
            description: 'The name of the queue',
            type: framecord_1.ArgumentType.String,
            maxLength: 100,
        }), new framecord_1.Argument({
            name: 'mode',
            description: 'The mode of the queue',
            type: framecord_1.ArgumentType.String,
        }));
    }
    async run(source, name, modeName) {
        const channel = await source.guild.channels.create({
            name,
            type: discord_js_1.ChannelType.GuildVoice,
        });
        const queue = await database_1.prisma.queue.create({
            data: {
                channelId: channel.id,
                guildId: channel.guildId,
                mode: {
                    connectOrCreate: {
                        where: {
                            nameLower: modeName.toLowerCase(),
                        },
                        create: {
                            name: modeName,
                            nameLower: modeName.toLowerCase(),
                        },
                    },
                },
            },
            select: {
                mode: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        return `Successfully created the \`${queue.mode.name}\` queue ${channel}.`;
    }
    async catch() {
        throw 'An error ocurred while trying to create the queue channel. Please try again later.';
    }
}
exports.default = CreateQueueCommand;

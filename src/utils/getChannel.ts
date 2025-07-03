import {
  Client,
  ForumChannel,
  PermissionsBitField,
  TextChannel,
  ThreadChannel,
} from 'discord.js';
import { ChannelType } from 'discord-api-types/v10';

export const getChannel = async (channelId: string, client: Client) => {
  const channel = await client.channels.fetch(channelId);
  if (channel === null) return null;
  if (!channel.isTextBased) return null;
  const textChannel = channel as TextChannel;

  const permissions = textChannel.permissionsFor(client.user!);
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
  ];

  if (!permissions?.has(requiredPermissions)) {
    return null;
  }
  return textChannel;
};

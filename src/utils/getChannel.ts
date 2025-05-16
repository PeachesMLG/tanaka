import {
  Client,
  ForumChannel,
  PermissionsBitField,
  TextChannel,
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

export const getForumChannel = async (channelId: string, client: Client) => {
  const channel = await client.channels.fetch(channelId);
  console.log(channel);
  if (channel === null) return null;
  if (channel.type !== ChannelType.GuildForum) return null;
  const forumChannel = channel as ForumChannel;

  const permissions = forumChannel.permissionsFor(client.user!);
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.CreatePublicThreads,
  ];

  console.log(permissions);

  if (!permissions?.has(requiredPermissions)) {
    console.log(':c no perms');
    return null;
  }
  return forumChannel;
};

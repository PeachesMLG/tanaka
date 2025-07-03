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

export const getForumChannel = async (channelId: string, client: Client) => {
  const channel = await client.channels.fetch(channelId);
  if (channel === null) return null;
  if (channel.type !== ChannelType.GuildForum) return null;
  const forumChannel = channel as ForumChannel;

  const permissions = forumChannel.permissionsFor(client.user!);
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.CreatePublicThreads,
  ];

  if (!permissions?.has(requiredPermissions)) {
    return null;
  }
  return forumChannel;
};

export const getForumPost = async (postId: string, client: Client) => {
  const channel = await client.channels.fetch(postId);
  if (!channel || channel.type !== ChannelType.PublicThread) return null;

  const thread = channel as ThreadChannel;

  const permissions = thread.permissionsFor(client.user!);
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessagesInThreads,
    PermissionsBitField.Flags.ManageThreads,
  ];

  if (!permissions?.has(requiredPermissions)) {
    return null;
  }

  return thread;
};

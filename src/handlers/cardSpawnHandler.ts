import { Client, PermissionsBitField, TextChannel } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
) => {
  if (cardSpawn.SummonedBy) {
    await createSummonTimer(cardSpawn, client);
  }
};

const createSummonTimer = async (cardSpawn: CardSpawn, client: Client) => {
  if (!cardSpawn.SummonedBy) return;
  const channel = await getChannel(
    cardSpawn.ServerId,
    cardSpawn.ChannelId,
    client,
  );
  if (channel === null) return;
  let futureTime = new Date(Date.now() + 1000 * 60 * 30);
  let unixTimestamp = Math.floor(futureTime.getTime() / 1000);
  await createTimer(
    channel,
    undefined,
    unixTimestamp,
    cardSpawn.SummonedBy,
    'Summons',
    client,
    'Automatically triggered by summon (This is a WIP Ill add a way to turn off later)',
  );
};

const getChannel = async (
  serverId: string,
  channelId: string,
  client: Client,
) => {
  const guild = client.guilds.cache.get(serverId);
  if (!guild) {
    return null;
  }

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
  return channel as TextChannel;
};

import { Client } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';

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
  const channel = await getChannel(cardSpawn.ChannelId, client);
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

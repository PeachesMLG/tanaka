import { Client } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getUserSetting } from '../database/userSettingsDatabase';
import { UserSettingsTypes } from '../UserSettingsTypes';

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

  const enabled =
    (await getUserSetting(
      cardSpawn.SummonedBy,
      UserSettingsTypes.AUTOMATIC_SUMMON_TIMERS,
    )) ?? true;

  if (!enabled) return;

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
    'Automatically triggered by summon\n Turn this off in the /usersettings command',
  );
};

import { Client } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
) => {
  await createSummonTimer(cardSpawn, client);
  if (
    !cardSpawn.SummonedBy &&
    cardSpawn.Cards.some(
      (value) => value.Rarity === 'SR' || value.Rarity === 'SSR',
    )
  ) {
    await sendHighTierPing(cardSpawn, client);
  }
};

const createSummonTimer = async (cardSpawn: CardSpawn, client: Client) => {
  if (!cardSpawn.SummonedBy) return;

  const enabled =
    (await getSetting(
      cardSpawn.SummonedBy,
      SettingsTypes.AUTOMATIC_SUMMON_TIMERS,
    )) ?? 'true';

  if (enabled !== 'true') return;

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
    'Automatically triggered by summon\n Turn this off in the /User Settings command',
  );
};

const sendHighTierPing = async (cardSpawn: CardSpawn, client: Client) => {
  console.log('Sending High Tier Ping message!');
  const channel = await getChannel(cardSpawn.ChannelId, client);
  const highTierPingRole = await getSetting(
    cardSpawn.ServerId,
    SettingsTypes.HIGH_TIER_PING_ROLE,
  );
  const highTierPingMessage = await getSetting(
    cardSpawn.ServerId,
    SettingsTypes.HIGH_TIER_PING_MESSAGE,
  );

  if (!highTierPingRole || !highTierPingMessage || !channel) {
    console.log(
      ':c ' +
        highTierPingRole +
        ' - ' +
        highTierPingMessage +
        ' - ' +
        channel?.id,
    );
    return;
  }

  await channel.send(highTierPingRole + ' ' + highTierPingMessage);
};

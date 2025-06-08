import { Client } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { waitForMessage } from '../utils/messageListener';
import { isUserPremium } from '../utils/userUtils';

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

  const userPremium = await isUserPremium(cardSpawn.SummonedBy);
  const nextSpawnInMinutes = userPremium ? 30 : 60;

  const channel = await getChannel(cardSpawn.ChannelId, client);
  if (channel === null) return;
  let futureTime = new Date(Date.now() + 1000 * 60 * nextSpawnInMinutes);
  await createTimer(
    channel,
    undefined,
    futureTime,
    cardSpawn.SummonedBy,
    'Summons',
    client,
    'Automatically triggered by summon\n Turn this off in the /user settings command',
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

  // Lets just check if any other bot is going to send this first
  waitForMessage((message) => message.content.includes(highTierPingRole)).then(
    (message) => {
      if (message) {
        console.log(
          'Ignoring because already sent by ' + message.author.username,
        );
        return;
      }

      console.log('Sending High Tier Ping!');
      channel.send(highTierPingRole + ' ' + highTierPingMessage);
    },
  );
};

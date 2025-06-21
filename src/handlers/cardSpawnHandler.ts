import { Client, Message, PartialMessage } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { waitForMessage } from '../utils/messageListener';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
  message: Message | PartialMessage,
) => {
  await createSummonTimer(cardSpawn, client);
  if (
    !cardSpawn.SummonedBy &&
    cardSpawn.Cards.some(
      (value) => value.Rarity === 'SR' || value.Rarity === 'SSR',
    )
  ) {
    console.log('Sending High Tier Ping message!');
    console.log(message.embeds[0].description);
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

  const nextSpawnInMinutes = 30;

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
  waitForMessage(
    (message) => message.content.includes(highTierPingRole),
    1000,
  ).then((message) => {
    if (message) {
      console.log(
        'Ignoring because already sent by ' + message.author.username,
      );
      return;
    }

    console.log('Sending High Tier Ping!');
    channel.send(highTierPingRole + ' ' + highTierPingMessage);
  });
};

import { Client, Message, PartialMessage } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { waitForMessage } from '../utils/messageListener';
import { getCard, getCardVersions } from '../utils/cardUtils';
import { CardInfo } from '../types/cardInfo';
import { mapTierToEmoji } from '../utils/emojis';
import { executeAtDate } from '../utils/timerUtils';

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
    console.log(
      'Sending High Tier Ping message! for ',
      message.guild?.name,
      ' in channel ',
      message.channel.id,
    );
    console.log(message.embeds[0].description);
    await sendHighTierPing(cardSpawn, message, client);
  } else if (!cardSpawn.SummonedBy) {
    await sendRegularSummonPing(cardSpawn, client);
  }
  await createVersionsSummary(cardSpawn, client, message);
};

const createVersionsSummary = async (
  cardSpawn: CardSpawn,
  client: Client,
  message: Message | PartialMessage,
) => {
  const despawnTime = new Date();
  despawnTime.setSeconds(despawnTime.getSeconds() + 20);

  const content = await Promise.all(cardSpawn.Cards.map(getCardSummary));

  const replyMessage = await message.reply(content.join('\n'));

  executeAtDate(despawnTime, async () => {
    await replyMessage.delete();
  });
};

const getCardSummary = async (card: CardInfo) => {
  const cardUUID = await getCard(card.Name, card.Series, card.Rarity);
  const versions = await getCardVersions(cardUUID ?? '');

  const cardInformation = `${mapTierToEmoji(card.Rarity)} - **${card.Name}** *${card.Series}*`;
  const versionInformation =
    versions.length > 0
      ? `-# Single Vs: ${versions.join(', ')}.`
      : `-# No Single Vs Remaining.`;

  return `${cardInformation}\n${versionInformation}`;
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

const sendHighTierPing = async (
  cardSpawn: CardSpawn,
  originalMessage: Message | PartialMessage,
  client: Client,
) => {
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
    originalMessage.reply(highTierPingRole + ' ' + highTierPingMessage);
  });
};

const sendRegularSummonPing = async (cardSpawn: CardSpawn, client: Client) => {
  const channel = await getChannel(cardSpawn.ChannelId, client);
  const regularTierPingRole = await getSetting(
    cardSpawn.ServerId,
    SettingsTypes.REGULAR_TIER_PING_ROLE,
  );
  const regularTierPingMessage = await getSetting(
    cardSpawn.ServerId,
    SettingsTypes.REGULAR_TIER_PING_MESSAGE,
  );

  if (!regularTierPingRole || !regularTierPingMessage || !channel) {
    return;
  }

  channel
    .send(regularTierPingRole + ' ' + regularTierPingMessage)
    .then(async (value) => await value.delete());
};

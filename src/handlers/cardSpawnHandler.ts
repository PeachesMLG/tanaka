import { Client, Message, PartialMessage } from 'discord.js';
import { CardSpawn } from '../types/cardSpawn';
import { createTimer } from '../timers';
import { getChannel } from '../utils/getChannel';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { getCardVersions } from '../utils/cardUtils';
import { mapTierToEmoji } from '../utils/emojis';
import { executeAtDate } from '../utils/timerUtils';
import { CardDetails } from '../types/cardDetails';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
  message: Message | PartialMessage,
) => {
  await createSummonTimer(cardSpawn, client);
  await createSummary(cardSpawn, client, message);
};

const createSummary = async (
  cardSpawn: CardSpawn,
  client: Client,
  message: Message | PartialMessage,
) => {
  if ((await getChannel(message.channelId, client)) === null) {
    return;
  }

  const despawnTime = new Date();
  despawnTime.setSeconds(despawnTime.getSeconds() + 20);

  const content = (
    await Promise.all(cardSpawn.Cards.map(getCardSummary))
  ).filter((value) => value) as string[];

  let finalMessage = '';

  if (!cardSpawn.SummonedBy) {
    const tierPing = await getTierPingForCards(cardSpawn, client);
    if (tierPing) {
      finalMessage = tierPing + '\n\n';
    }
  }

  if (content) {
    finalMessage += content.join('\n') + '\n-# Data from 2nd October 2025, may be outdated';
    
    const replyMessage = await message.reply(finalMessage);

    executeAtDate(despawnTime, async () => {
      await replyMessage.delete();
    });
  }
};

const getCardSummary = async (card: CardDetails) => {
  if (!card.UUID) {
    return undefined;
  }
  const versions = await getCardVersions(card.UUID);
  const cardInformation = `${mapTierToEmoji(card.Rarity)} - **${card.CardName}** *${card.SeriesName}*`;

  const versionInformation =
    versions.length > 0
      ? `-# Single Vs: ${versions.join(', ')}.`
      : `-# No Single Vs Remaining.`;

  return `${cardInformation}\n${versionInformation}`;
};

const getTierPingForCards = async (
  cardSpawn: CardSpawn,
  client: Client,
): Promise<string | null> => {
  const tiers = cardSpawn.Cards.map(card => card.Rarity);

  let highestTier = SettingsTypes.COMMON_TIER_PING_ROLE;
  
  if (tiers.includes('UR')) {
    highestTier = SettingsTypes.UR_TIER_PING_ROLE;
  } else if (tiers.includes('SSR')) {
    highestTier = SettingsTypes.SSR_TIER_PING_ROLE;
  } else if (tiers.includes('SR')) {
    highestTier = SettingsTypes.SR_TIER_PING_ROLE;
  } else if (tiers.includes('R')) {
    highestTier = SettingsTypes.RARE_TIER_PING_ROLE;
  }

  const pingRole = await getSetting(cardSpawn.ServerId, highestTier);
  return pingRole || null;
};

const createSummonTimer = async (cardSpawn: CardSpawn, client: Client) => {
  if (!cardSpawn.SummonedBy) return;

  const defaultSetting =
    (await getSetting(
      cardSpawn.ServerId,
      SettingsTypes.ENABLE_AUTOMATIC_TIMERS_AS_DEFAULT,
    )) ?? 'true';

  const enabled =
    (await getSetting(
      cardSpawn.SummonedBy,
      SettingsTypes.AUTOMATIC_SUMMON_TIMERS,
    )) ?? defaultSetting;

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
    '</summon:1301277778385174601>',
    client,
    'Automatically triggered by summon\n Turn this off in the /user settings command',
  );
};

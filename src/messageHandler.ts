import { Client, Message, PartialMessage } from 'discord.js';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { mapEmojiToTier } from './utils/emojis';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { TimedList } from './utils/timedList';
import { CardInfo } from './types/cardInfo';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel } from './utils/getChannel';
import { createTimer } from './timers';

const handledMessages = new TimedList();
const claimPattern =
  /^(.+?)\s+•\s+\*\*(.+?)\*\*\s+•\s+\*(.+?)\*\s+•\s+`v(\d+)`$/;
const claimedByPattern = /<@!?(\d+)>/;
const spawnPattern = /^(.*?) \*\*(.*?)\*\* • \*(.*?)\*$/;

export const handleMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledMessages.getItems().includes(message.id)) return;
  if (message.author?.id !== '1242388858897956906') return;
  if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Summon') &&
    !message.embeds[0].title?.includes('Claimed')
  ) {
    await handleCardSummon(message, client);
  } else if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Card Claimed')
  ) {
    await handleCardClaim(message, client);
  } else if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('☀️ Summer Rewards ☀️')
  ) {
    await handleSummerSpawn(message, client);
  }
};

const handleSummerSpawn = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  const user = await getUserByMessageReference(
    message.reference,
    message.interactionMetadata,
    message.channel,
  );

  if (!user) return;

  const enabled =
    (await getSetting(user, SettingsTypes.AUTOMATIC_SUMMER_TIMERS)) ?? 'true';

  if (enabled !== 'true') return;

  const nextSpawnInMinutes = 30;

  const channel = await getChannel(message.channelId, client);
  if (channel === null) return;
  let futureTime = new Date(Date.now() + 1000 * 60 * nextSpawnInMinutes);
  await createTimer(
    channel,
    undefined,
    futureTime,
    user,
    'Summons',
    client,
    'Automatically triggered by Summer Spawn\n Turn this off in the /user settings command',
  );
};

const handleCardSummon = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (!message.embeds[0].description) return;
  handledMessages.add(message.id);

  const cardInfo = message.embeds[0].description
    ?.split('\n')
    .map(GetCardSummonInfo)
    .filter((cardInfo) => cardInfo) as CardInfo[];

  await cardSpawnHandler(
    {
      ChannelId: message.channelId ?? '',
      ServerId: message.guildId ?? '',
      SummonedBy: await getUserByMessageReference(
        message.reference,
        message.interactionMetadata,
        message.channel,
      ),
      Cards: cardInfo,
    },
    client,
    message,
  );
};

const handleCardClaim = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  handledMessages.add(message.id);

  const cardInfo = message.embeds[0].description
    ?.split('\n')
    .map(GetCardClaimInfo)
    .filter((cardInfo) => cardInfo) as CardInfo[];

  const userIds = message.embeds[0].description
    ?.split('\n')
    .map(GetClaimedBy)
    .filter((cardInfo) => cardInfo) as string[];

  const userId = userIds[0] ?? 'N/A';

  for (const card of cardInfo) {
    await cardClaimHandler(
      {
        ServerId: message.guildId?.toString() ?? '',
        UserID: userId,
        Version: parseInt(card.Version),
        Name: card.Name,
        Series: card.Series,
        Rarity: card.Rarity,
        DateTime: new Date(),
      },
      client,
    );
  }

  const match = message.content?.match(claimPattern);
  if (match) {
    handledMessages.add(message.id);
    const [, userId, emote, name, series, version] = match;
    await cardClaimHandler(
      {
        ServerId: message.guildId?.toString() ?? '',
        UserID: userId,
        Version: parseInt(version),
        Name: name,
        Series: series,
        Rarity: mapEmojiToTier(emote),
        DateTime: new Date(),
      },
      client,
    );
  }
};

const GetCardSummonInfo = (description: string) => {
  const match = description.match(spawnPattern);
  if (match) {
    const [, emote, name, series] = match;
    return {
      Name: name,
      Series: series,
      Rarity: mapEmojiToTier(emote),
    } as CardInfo;
  }
  return undefined;
};

const GetCardClaimInfo = (description: string) => {
  const match = description.match(claimPattern);
  if (match) {
    const [, emote, name, series, version] = match;
    return {
      Name: name,
      Series: series,
      Rarity: mapEmojiToTier(emote),
      Version: version,
    } as CardInfo;
  }
  return undefined;
};

const GetClaimedBy = (description: string) => {
  const match = description.match(claimedByPattern);
  if (match) {
    const [, userId] = match;
    return userId;
  }
  return undefined;
};

import { Client, Message, PartialMessage } from 'discord.js';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { TimedList } from './utils/timedList';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel } from './utils/getChannel';
import { createTimer } from './timers';
import { getCardInfo } from './utils/cardUtils';
import { CardDetails } from './types/cardDetails';
import { saveClanWarAttack } from './database/clanWarDatabase';

const handledCardSummonMessages = new TimedList();
const handledCardClaimMessages = new TimedList();
const handledSummerMessages = new TimedList();
const handledWarMessages = new TimedList();
const claimPattern =
  /^(.+?)\s+•\s+\*\*(.+?)\*\*\s+•\s+\*(.+?)\*\s+•\s+`v(\d+)`$/;
const claimedByPattern = /<@!?(\d+)>/;
const clanWarRegex =
  /Your (<:[\w]+:\d+>) \*\*(\w+)\*\* has been applied on \*\*(\w+)\*\*\./;

export const handleMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (message.author?.id !== '1242388858897956906') return;
  if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Item Sent!')
  ) {
    await handleClanWarSummons(message, client);
  }
};

const handleClanWarSummons = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledWarMessages.getItems().includes(message.id)) return;
  handledWarMessages.add(message.id);

  const user = await getUserByMessageReference(
    message.reference,
    message.interactionMetadata,
    message.channel,
  );

  if (!user) return;

  const description = message.embeds[0].description?.split('\n') ?? [];
  for (const line of description) {
    const match = line.match(clanWarRegex);

    if (match) {
      await saveClanWarAttack(user, match[2], match[3]);
    }
  }

  const enabled =
    (await getSetting(user, SettingsTypes.AUTOMATIC_CLAN_WAR_TIMERS)) ?? 'true';

  if (enabled !== 'true') return;

  const nextSpawnInMinutes = 15;

  const channel = await getChannel(message.channelId, client);
  if (channel === null) return;
  let futureTime = new Date(Date.now() + 1000 * 60 * nextSpawnInMinutes);
  await createTimer(
    channel,
    undefined,
    futureTime,
    user,
    'Clan War Time!',
    client,
    'Automatically triggered by Clan Wars\n Turn this off in the /user settings command',
  );
};

const handleSummerSpawn = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledSummerMessages.getItems().includes(message.id)) return;
  handledSummerMessages.add(message.id);

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
    'Summer Time',
    client,
    'Automatically triggered by Summer Spawn\n Turn this off in the /user settings command',
  );
};

const handleCardSummon = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledCardSummonMessages.getItems().includes(message.id)) return;
  if (
    !message.embeds[0].image ||
    !message.embeds[0].image.url.includes('/packs/')
  )
    return;
  handledCardSummonMessages.add(message.id);

  const cardUUIDs =
    message.embeds[0].image?.url
      .split('/packs/')[1]
      .split('/')
      .filter((uuid) => uuid) ?? [];

  if (cardUUIDs) {
    handledCardSummonMessages.add(message.id);
  }

  const cardInfo = (await Promise.all(cardUUIDs.map(getCardInfo))).filter(
    (cardInfo) => cardInfo,
  ) as CardDetails[];

  if (!cardInfo) {
    return;
  }

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
  if (handledCardClaimMessages.getItems().includes(message.id)) return;
  if (!message.embeds[0].description) return;

  const cardUUID = message.embeds[0]
    .image!.url.split('/cards/')[1]
    .split('.')[0];
  const cardDetails = await getCardInfo(cardUUID);
  if (!cardDetails) return;

  handledCardClaimMessages.add(message.id);

  const cardInfo = message.embeds[0].description
    ?.split('\n')
    .map(GetCardClaimInfo)
    .filter((cardInfo) => cardInfo);

  const userIds = message.embeds[0].description
    ?.split('\n')
    .map(GetClaimedBy)
    .filter((cardInfo) => cardInfo) as string[];

  const userId = userIds[0] ?? 'N/A';
  const version = cardInfo[0]?.Version ?? 'N/A';

  await cardClaimHandler(
    {
      ServerId: message.guildId?.toString() ?? '',
      UserID: userId,
      CardItem: {
        Version: version,
        Details: cardDetails,
      },
      DateTime: new Date(),
    },
    client,
  );
};

const GetCardClaimInfo = (description: string) => {
  const match = description.match(claimPattern);
  if (match) {
    const [, emote, name, series, version] = match;
    return {
      Version: version,
    };
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

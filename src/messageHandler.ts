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
import { isUserPremium } from './utils/userUtils';
import { LeaderboardType } from './types/leaderboardType';
import { incrementLeaderboard } from './database/leaderboardDatabase';
import { BaseCardInfo, MazokuCardAPIResponse } from './types/mazokuApi';

const handledCardSummonMessages = new TimedList();
const handledCardClaimMessages = new TimedList();
const handledTimerMessages = new TimedList();
//[full match, emoteId, name, seriesName]
const fullSpawnLinePattern =
  /^<a?:.+?:(\d+)>\s+\*\*(.+?)\*\*\s+•\s+\*(.+?)\*(?:\s+•\s+\`v\d+\`)?$/;
//[full match, emoteId, name, seriesName, version, userId]
const fullClaimPattern =
  /<a?:.+?:(\d+)>\s+•\s+\*\*(.+?)\*\*\s+•\s+\*(.+?)\*\s+•\s+`v(\d+)`[\s\S]*?<@!?(\d+)>/;
const rarityMap: Record<string, string | undefined> = {
  '1342202221558763571': 'C',
  '1342202219574857788': 'R',
  '1342202597389373530': 'SR',
  '1342202212948115510': 'SSR',
};

type Timer = {
  title: string;
  cooldown: number;
  timerMessage: string;
  timerInformation: string;
  setting: SettingsTypes;
  leaderboard?: LeaderboardType;
  premiumCooldown?: number;
};

const timers = [
  {
    title: 'Summon',
    cooldown: 30,
    premiumCooldown: 15,
    timerMessage: '</summon:1301277778385174601>',
    timerInformation:
      'Automatically triggered by summon\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_SUMMON_TIMERS,
  },
  {
    title: 'Gala Summon',
    cooldown: 60,
    premiumCooldown: 30,
    timerMessage: '</event summon:1531824046507950310>',
    timerInformation:
      'Automatically triggered by event summon\n Turn this off in the /user settings command',
    setting: SettingsTypes.AUTOMATIC_EVENT_TIMERS,
  },
] as Timer[];

export const handleMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (
    message.author?.id !== '1242388858897956906' ||
    Date.now() - message.createdTimestamp > 1000 * 60 * 2.5
  )
    return;
  await handleTimers(message, client);
  if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Summon') &&
    !message.embeds[0].title?.includes('Claimed')
  ) {
    await handleCardSummon(message, client);
  } else if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Claimed') &&
    message.embeds[0].image
  ) {
    await handleCardClaim(message, client);
  }
};

const handleTimers = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  for (const timer of timers) {
    if (message.embeds.length > 0 && message.embeds[0].title === timer.title) {
      if (handledTimerMessages.getItems().includes(message.id)) return;
      handledTimerMessages.add(message.id);

      const user = await getUserByMessageReference(
        message.reference,
        message.interactionMetadata,
        message.channel,
      );

      if (!user) return;

      if (client.users.cache.get(user)?.bot) return;

      if (timer.leaderboard) {
        await incrementLeaderboard(user, timer.leaderboard);
      }

      const defaultSetting =
        (await getSetting(
          message.guild?.id ?? '',
          SettingsTypes.ENABLE_AUTOMATIC_TIMERS_AS_DEFAULT,
        )) ?? 'true';

      const enabled = (await getSetting(user, timer.setting)) ?? defaultSetting;

      if (enabled !== 'true') return;

      const channel = await getChannel(message.channelId, client);
      if (channel === null) return;

      let cooldown = timer.cooldown;

      if (timer.premiumCooldown && (await isUserPremium(user))) {
        cooldown = timer.premiumCooldown;
      }

      let futureTime = new Date(Date.now() + 1000 * 60 * cooldown);
      await createTimer(
        channel,
        undefined,
        futureTime,
        user,
        timer.timerMessage,
        client,
        timer.timerInformation,
      );
      return;
    }
  }
};

const handleCardSummon = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledCardSummonMessages.getItems().includes(message.id)) return;
  if (
    !message.embeds[0].image ||
    !message.embeds[0].description
    //!message.embeds[0].image.url.includes('/packs/')
  )
    return;
  handledCardSummonMessages.add(message.id);

  //const rawSegments =
  //  message.embeds[0].image.url
  //    .split('/packs/')[1]
  //    .split('/')
  //    .filter((uuid) => uuid) ?? [];
  //
  //const cardUUIDs: string[] = rawSegments.map((segment, index) => {
  //  if (index === rawSegments.length - 1 && segment.includes('.')) {
  //    return segment.split('.')[0];
  //  }
  //  return segment;
  //});

  const cardLines = message.embeds[0].description.split('\n');
  const parseData: BaseCardInfo[] = cardLines.reduce<BaseCardInfo[]>(
    (acc, line) => {
      const match: RegExpMatchArray | null = line.match(fullSpawnLinePattern);
      if (match) {
        acc.push({
          rarity: rarityMap[match[1]] ?? 'unknown',
          name: match[2],
          series: match[3],
        });
      }
      return acc;
    },
    [],
  );

  const cardUUIDs: string[] = await Promise.all(
    parseData.map(async (card) => {
      const response = await fetch(
        `https://mazoku.cc/api/public/cards?page=1&pageSize=4&orderBy=created_at&order=DESC&spicy=false&eventName=default&tiers=${card.rarity}&name="${card.name}"&seriesName="${card.series}"`,
        {
          headers: {
            'User-Agent': 'Lasagna-Bot/1.0 (@1marius)',
            Accept: 'application/json',
          },
        },
      ).catch((error: unknown) => {
        console.error(
          `[UUIDREQUEST] Error fetching card versions for ${card.name} ${card.series} ${card.rarity}:`,
          error,
        );
        return null;
      });
      if (!response?.ok) {
        const errorBody = await response
          ?.text()
          .catch(() => 'No response body');
        console.error(
          `[UUIDREQUEST] API request failed with status ${response?.status.toString() ?? 'N/A'} | Body: ${errorBody}`,
        );
        return 'N/A';
      }

      const data: MazokuCardAPIResponse | null = (await response
        .json()
        .catch((error: unknown) => {
          console.error(
            `Error parsing JSON for ${card.name} ${card.series} ${card.rarity}:`,
            error,
          );
          return null;
        })) as MazokuCardAPIResponse | null;

      if (data?.total != 1) return 'N/A';
      return data.cards[0].id;
    }),
  );

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

  //const cardUUID = message.embeds[0]
  //  .image!.url.split('/cards/')[1]
  //  .split('.')[0];
  const shownCard = message.embeds[0].description.match(fullClaimPattern);
  if (!shownCard) return;
  const [_, emoteId, name, series, version, userId] = shownCard;

  const partialCardData: Omit<CardDetails, 'UUID'> = {
    CardName: name,
    SeriesName: series,
    Rarity: rarityMap[emoteId] ?? 'C',
    EventName: 'default',
  };

  const response = await fetch(
    `https://mazoku.cc/api/public/cards?page=1&pageSize=4&orderBy=created_at&order=DESC&spicy=false&eventName=default&tiers=${partialCardData.Rarity}&name="${partialCardData.CardName}"&seriesName="${partialCardData.SeriesName}"`,
    {
      headers: {
        'User-Agent': 'Lasagna-Bot/1.0 (@1marius)',
        Accept: 'application/json',
      },
    },
  ).catch((error: unknown) => {
    console.error(
      `[UUIDREQUEST] Error fetching card versions for ${partialCardData.CardName} ${partialCardData.SeriesName} ${partialCardData.Rarity}:`,
      error,
    );
    return null;
  });

  if (!response?.ok) {
    const errorBody = await response?.text().catch(() => 'No response body');
    console.error(
      `[UUIDREQUEST] API request failed with status ${response?.status.toString() ?? 'N/A'} | Body: ${errorBody}`,
    );
    return;
  }

  const data: MazokuCardAPIResponse | null = (await response
    .json()
    .catch((error: unknown) => {
      console.error(
        `Error parsing JSON for ${partialCardData.CardName} ${partialCardData.SeriesName} ${partialCardData.Rarity}:`,
        error,
      );
      return null;
    })) as MazokuCardAPIResponse | null;

  if (data?.total != 1) return;
  const cardDetails: CardDetails = {
    ...partialCardData,
    UUID: data.cards[0].id,
  };

  //const cardDetails = await getCardInfo(cardUUID);
  if (!cardDetails) return;

  handledCardClaimMessages.add(message.id);

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

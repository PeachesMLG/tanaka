import { Client, Message, PartialMessage } from 'discord.js';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { mapEmojiToTier } from './utils/emojis';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { TimedList } from './utils/timedList';

const handledMessages = new TimedList();
const pattern =
  /^<@!?(\d+)> claimed (.+?) • \*\*(.+?)\*\* • \*(.+?)\* • `v([\d.]+)`!$/;

export const handleMessage = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  if (handledMessages.getItems().includes(message.id)) return;
  if (message.author?.id !== '1242388858897956906') return;
  if (
    message.embeds.length > 0 &&
    message.embeds[0].title?.includes('Cards Summoned')
  ) {
    await handleCardSummon(message, client);
  } else if (message.embeds.length === 0) {
    await handleCardClaim(message, client);
  }
};

const handleCardSummon = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  handledMessages.add(message.id);
  await cardSpawnHandler(
    {
      ChannelId: message.channelId ?? '',
      ServerId: message.guildId ?? '',
      SummonedBy: await getUserByMessageReference(
        message.reference,
        message.interactionMetadata,
        message.channel,
      ),
    },
    client,
  );
};

const handleCardClaim = async (
  message: Message | PartialMessage,
  client: Client,
) => {
  const match = message.content?.match(pattern);
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

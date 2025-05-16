import { Client, Message, PartialMessage } from 'discord.js';
import { CardSpawn } from './types/cardSpawn';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { CardClaim } from './types/cardClaim';
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
  if (message.author?.id === '1242388858897956906') {
    if (
      message.embeds.length > 0 &&
      message.embeds[0].title?.includes('Cards Summoned')
    ) {
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
    } else if (message.embeds.length === 0) {
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
    }
  }
};

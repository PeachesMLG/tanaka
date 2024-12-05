import { CardSpawn } from '../types/websocketMessage';
import { saveCardSpawn } from '../database';
import { Client, TextChannel } from 'discord.js';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
) => {
  await saveCardSpawn(cardSpawn);
  setTimeout(async () => await sendSpawnSummery(cardSpawn, client), 500);
};

const sendSpawnSummery = async (cardSpawn: CardSpawn, client: Client) => {
  const channel = await client.channels.fetch(cardSpawn.channelId);
  if (channel === null) return;
  if (!channel.isTextBased) return;
  const textChannel = channel as TextChannel;
  const messages = await textChannel.messages.fetch({ limit: 100 });

  const claim = cardSpawn.claims[0];
  const expectedTitle =
    claim.claimType === 'summon' ? 'Manual Summon' : 'Automatic Summon';
  const spawnTime = new Date(claim.dateTime);
  const despawnTime = new Date(spawnTime.getTime() + 20 * 1000);
  const discordTimestamp = `<t:${Math.floor(despawnTime.getTime() / 1000)}:R>`;

  const targetMessage = messages.find(
    (msg) =>
      msg.author.id === '1242388858897956906' &&
      msg.embeds.some(
        (embed) => embed.title && embed.title.includes(expectedTitle),
      ),
  );

  if (!targetMessage) return;

  const claimContent = cardSpawn.claims.map((value, index): string => {
    return `${index}: - **${value.card.name}** *${value.card.series}*\n`;
  });

  const content = `Card will despawn ${discordTimestamp}\n${claimContent}`;

  const message = await targetMessage.reply(content);

  setTimeout(async () => await message.delete(), 20000);
};

import { CardSpawn } from '../types/websocketMessage';
import { saveCardSpawn } from '../database';
import { Client, PermissionsBitField, TextChannel } from 'discord.js';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
) => {
  await saveCardSpawn(cardSpawn);
  setTimeout(async () => await sendSpawnSummary(cardSpawn, client), 500);
};

const sendSpawnSummary = async (cardSpawn: CardSpawn, client: Client) => {
  try {
    const guild = client.guilds.cache.get(cardSpawn.serverId);
    if (!guild) {
      return;
    }

    const channel = await client.channels.fetch(cardSpawn.channelId);
    if (channel === null) return;
    if (!channel.isTextBased) return;
    const textChannel = channel as TextChannel;

    const permissions = textChannel.permissionsFor(client.user!);
    const requiredPermissions = [
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.ViewChannel,
    ];

    if (!permissions?.has(requiredPermissions)) {
      return;
    }

    const messages = await textChannel.messages.fetch({ limit: 10 });

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
      return `${index + 1}: - **${value.card.name}** *${value.card.series}*`;
    });

    const content = `Card will despawn ${discordTimestamp}\n${claimContent.join('\n')}`;

    const message = await targetMessage.reply(content);

    setTimeout(
      async () => await message.delete(),
      despawnTime.getTime() - new Date().getTime(),
    );
  } catch (e) {
    console.error(e);
  }
};

import { Card, CardSpawn } from '../types/websocketMessage';
import { saveCardSpawn } from '../database';
import { Client, Message, PermissionsBitField, TextChannel } from 'discord.js';
import { mapEmoji } from '../utils/emojis';
import { getRemainingVersionsByCard } from '../utils/inventoryItems';
import { createTimer } from '../timers';
import { waitForMessage } from '../messageListener';

export const cardSpawnHandler = async (
  cardSpawn: CardSpawn,
  client: Client,
) => {
  const claim = cardSpawn.claims[0];
  await saveCardSpawn(cardSpawn);
  if (claim.claimType === 'summon') {
    await createSummonTimer(cardSpawn, claim.autoClaimableBy, client);
  }

  await sendSpawnSummary(cardSpawn, client);
};

const createSummonTimer = async (
  cardSpawn: CardSpawn,
  userId: string,
  client: Client,
) => {
  const channel = await getChannel(
    cardSpawn.serverId,
    cardSpawn.channelId,
    client,
  );
  if (channel === null) return;
  let futureTime = new Date(Date.now() + 1000 * 60 * 30);
  let unixTimestamp = Math.floor(futureTime.getTime() / 1000);
  await createTimer(
    channel,
    undefined,
    unixTimestamp,
    userId,
    'Summons',
    client,
    'Automatically triggered by summon (This is a WIP Ill add a way to turn off later)',
  );
};

const sendSpawnSummary = async (cardSpawn: CardSpawn, client: Client) => {
  try {
    const channel = await getChannel(
      cardSpawn.serverId,
      cardSpawn.channelId,
      client,
    );
    if (channel === null) return;

    const claim = cardSpawn.claims[0];
    const spawnTime = new Date(claim.dateTime);
    const despawnTime = new Date(spawnTime.getTime() + 20 * 1000);
    const discordTimestamp = `<t:${Math.floor(despawnTime.getTime() / 1000)}:R>`;

    const claimContent = await Promise.all(
      cardSpawn.claims.map(async (value, index) => {
        const singleVersions = await getRemainingVersionsByCard(
          value.card.id,
          10,
        );

        const cardInformation = `\`${String.fromCharCode(65 + index)}\`: ${mapEmoji(value.card.tier)} - **${value.card.name}** *${value.card.series}*`;
        const versionInformation =
          singleVersions.length > 0
            ? `-# Single Vs: ${singleVersions.join(', ')}.`
            : `-# No Single Vs Remaining.`;

        return `${cardInformation}\n${versionInformation}`;
      }),
    );

    const content = `Card will despawn ${discordTimestamp}\n${claimContent.join('\n')}`;

    const targetMessage = await waitForMessage((message) =>
      isSpawnMessage(message, cardSpawn),
    );

    if (!targetMessage) return;

    const message = await targetMessage.reply(content);

    setTimeout(
      async () => await message.delete(),
      despawnTime.getTime() - new Date().getTime(),
    );
  } catch (e) {
    console.error(e);
  }
};

function isSpawnMessage(message: Message, cardSpawn: CardSpawn): boolean {
  const claim = cardSpawn.claims[0];
  const expectedTitle =
    claim.claimType === 'summon' ? 'Manual Summon' : 'Automatic Summon';

  return (
    message.author.id === '1242388858897956906' &&
    message.channelId === cardSpawn.channelId &&
    message.embeds.some(
      (embed) => embed.title && embed.title.includes(expectedTitle),
    )
  );
}

const getChannel = async (
  serverId: string,
  channelId: string,
  client: Client,
) => {
  const guild = client.guilds.cache.get(serverId);
  if (!guild) {
    return null;
  }

  const channel = await client.channels.fetch(channelId);
  if (channel === null) return null;
  if (!channel.isTextBased) return null;
  const textChannel = channel as TextChannel;

  const permissions = textChannel.permissionsFor(client.user!);
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ViewChannel,
  ];

  if (!permissions?.has(requiredPermissions)) {
    return null;
  }
  return channel as TextChannel;
};

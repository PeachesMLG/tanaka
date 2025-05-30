import {
  ActionRowBuilder,
  ButtonBuilder,
  Client,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { Auction, AuctionStatus } from './types/auction';
import {
  getAuctionById,
  getAuctionsByState,
  saveAuction,
  updateAuction,
} from './database/auctionDatabase';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getForumChannel, getForumPost } from './utils/getChannel';
import {
  getEmbedImage,
  getEmbedMessage,
  getEmbedMessageGuild,
} from './utils/embeds';
import {
  getAttachments,
  getMaxAuctionsPerQueue,
  getPendingAuctionChannel,
  getQueueAuctionChannel,
} from './utils/auctionUtils';
import { executeAtDate } from './utils/timerUtils';
import { AuctionEditorValues } from './modalEditors/auctionModalEditor';
import { QueueType } from './types/queueType';

export async function createAuction(
  auction: AuctionEditorValues,
  client: Client,
) {
  const { channel: pendingAuctionChannel, error } =
    await getPendingAuctionChannel(auction.ServerId, client);

  if (!pendingAuctionChannel) {
    return error;
  }

  const auctionId = await saveAuction({
    ServerId: auction.ServerId,
    UserId: auction.UserId,
    CardId: auction.CardId,
    Version: auction.CardVersion,
    Status: AuctionStatus.PENDING,
    Rarity: auction.CardRarity,
    Series: auction.CardSeries,
    Name: auction.CardName,
    ThreadId: '',
    QueueMessageId: '',
    ChannelId: auction.ChannelId,
    QueueType: QueueType.Regular,
    ImageUrl: auction.CardImage,
    CurrencyPreferences: auction.CurrencyPreference,
  });

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`auction_approve_${auctionId}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`auction_reject_${auctionId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
    );

  await pendingAuctionChannel.send({
    embeds: [
      getEmbedMessage(
        pendingAuctionChannel,
        `${auction.CardRarity} ${auction.CardName} Version ${auction.CardVersion}`,
        `<@${auction.UserId}> Posted a new Auction\nCurrency Preferences${auction.CurrencyPreference}`,
      ),
    ],
    files: await getAttachments(auction.CardImage),
    components: [row],
  });

  return 'Auction Added to Queue!\nDo /auction list at any time to see your current queue position';
}

export async function startAuction(auctionId: string, client: Client) {
  console.log('Starting auction');
  const auction = await getAuctionById(parseInt(auctionId));
  if (!auction) return;

  await deleteQueueMessage(auction, client);

  const auctionLifeTimeMinutes = await getSetting(
    auction.ServerId,
    SettingsTypes.AUCTION_LIFETIME_MINUTES,
  );
  const expirationDate = new Date(
    Date.now() + parseInt(auctionLifeTimeMinutes ?? '10') * 60 * 1000,
  );
  const unixTimestamp = Math.floor(expirationDate.getTime() / 1000);

  const channel = await getForumChannel(auction.ChannelId, client);
  if (!channel) return;

  const threadPost = await channel.threads.create({
    name: `${auction.Rarity} ${auction.Name} Version ${auction.Version}`,
    message: {
      embeds: [
        getEmbedMessageGuild(
          channel.guild,
          `${auction.Rarity} ${auction.Name} Version ${auction.Version}`,
          `<@${auction.UserId}> Posted a new Auction\nCurrency Preferences${auction.CurrencyPreferences}\n Expires: <t:${unixTimestamp}:R>`,
        ),
      ],
      files: await getAttachments(auction.ImageUrl),
    },
  });

  threadPost
    .send(`<@${auction.UserId}> your auction has started!`)
    .then((value) => value.delete());

  await updateAuction({
    ID: parseInt(auctionId),
    Status: AuctionStatus.IN_AUCTION,
    ThreadId: threadPost.id,
    ExpiresDateTime: expirationDate,
  });

  await activateAuction(auction.ID, client);
}

export async function approveAuction(
  auctionId: string,
  serverId: string,
  client: Client,
) {
  const queueChannel = await getQueueAuctionChannel(serverId, client);
  if (!queueChannel) {
    console.log('Queue channel not setup...');
    await startAuction(auctionId, client);
    return;
  }
  const auction = await getAuctionById(parseInt(auctionId));
  if (!auction) {
    console.error('Could not get auction by ID ' + auctionId);
    return;
  }

  const message = await queueChannel.send({
    embeds: [
      getEmbedMessage(
        queueChannel,
        `${auction.Rarity} ${auction.Name} Version ${auction.Version}`,
        `<@${auction.UserId}> Posted a new Auction`,
      ),
    ],
    files: await getAttachments(auction.ImageUrl),
  });

  await updateAuction({
    ID: parseInt(auctionId),
    Status: AuctionStatus.IN_QUEUE,
    QueueMessageId: message.id,
  });

  await startNextAuctions(auction.ServerId, auction.Rarity, client);
}

export async function rejectAuction(auctionId: string) {
  await updateAuction({
    ID: parseInt(auctionId),
    Status: AuctionStatus.REJECTED,
  });
}

export async function startNextAuctions(
  serverId: string,
  rarity: string,
  client: Client,
) {
  const maxAuctionsPerQueue = parseInt(
    (await getMaxAuctionsPerQueue(rarity, serverId)) ?? '0',
  );

  if (maxAuctionsPerQueue === 0) {
    console.error('Max Auctions Per Queue is not setup!');
  }

  const activeAuctions = await getAuctionsByState(
    AuctionStatus.IN_AUCTION,
    serverId,
    rarity,
  );

  const auctionsInQueue = await getAuctionsByState(
    AuctionStatus.IN_QUEUE,
    serverId,
    rarity,
  );

  const availableSlots = maxAuctionsPerQueue - activeAuctions.length;

  auctionsInQueue.sort(
    (a, b) =>
      new Date(a.CreatedDateTime).getTime() -
      new Date(b.CreatedDateTime).getTime(),
  );

  for (let i = 0; i < availableSlots && auctionsInQueue.length > 0; i++) {
    const auction = auctionsInQueue.shift();
    if (auction) {
      await startAuction(auction.ID.toString(), client);
    }
  }
}

export async function finishAuction(auction: Auction, client: Client) {
  await updateAuction({
    ID: auction.ID,
    Status: AuctionStatus.DONE,
  });

  const channel = await getForumPost(auction.ThreadId, client);
  if (!channel) return;
  await channel.send('Auction Finished!');
  await channel.setLocked(true, 'Auction Ended');

  await startNextAuctions(auction.ServerId, auction.Rarity, client);
}

export async function activateAllAuctions(client: Client) {
  const auctions = await getAuctionsByState(AuctionStatus.IN_AUCTION);
  auctions.forEach((auction) => {
    activateAuction(auction.ID, client);
  });
}

async function activateAuction(auctionId: number, client: Client) {
  const auction = await getAuctionById(auctionId);
  if (!auction) return;
  executeAtDate(
    auction.ExpiresDateTime,
    async () => await finishAuction(auction, client),
  );
}

async function deleteQueueMessage(auction: Auction, client: Client) {
  const queueChannel = await getQueueAuctionChannel(auction.ServerId, client);
  if (queueChannel && auction.QueueMessageId) {
    try {
      const queueMessage = await queueChannel.messages.fetch(
        auction.QueueMessageId,
      );
      if (queueMessage) {
        await queueMessage.delete();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

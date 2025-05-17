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
import { getEmbedImage } from './utils/embeds';
import { getCardImage } from './utils/cardUtils';
import {
  getPendingAuctionChannel,
  getQueueAuctionChannel,
} from './utils/auctionUtils';

export async function createAuction(
  auction: Omit<
    Auction,
    'ID' | 'PositionInQueue' | 'CreatedDateTime' | 'ExpiresDateTime'
  >,
  client: Client,
) {
  const { channel: pendingAuctionChannel, error } =
    await getPendingAuctionChannel(auction.ServerId, client);

  if (!pendingAuctionChannel) {
    return error;
  }

  const auctionId = await saveAuction({
    ...auction,
    QueueMessageId: '',
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
      getEmbedImage(
        pendingAuctionChannel.guild,
        `${auction.Rarity} ${auction.Name} ${auction.Version}`,
        `<@${auction.UserId}> Posted a new Auction`,
        getCardImage(auction.CardId),
      ),
    ],
    components: [row],
  });

  return 'Auction Added to Queue!';
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
    name: `${auction.Rarity} ${auction.Name} ${auction.Version}`,
    message: {
      embeds: [
        getEmbedImage(
          channel.guild,
          `${auction.Rarity} ${auction.Name} ${auction.Version}`,
          `<@${auction.UserId}> Posted a new Auction\n Expires: <t:${unixTimestamp}:R>`,
          `https://cdn3.mazoku.cc/a/750/card/${auction.CardId}.webp`,
        ),
      ],
    },
  });

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
      getEmbedImage(
        queueChannel.guild,
        `${auction.Rarity} ${auction.Name} ${auction.Version}`,
        `<@${auction.UserId}> Posted a new Auction`,
        getCardImage(auction.CardId ?? ''),
      ),
    ],
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
    (await getSetting(serverId, SettingsTypes.MAX_AUCTIONS_PER_QUEUE)) ?? '0',
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

  console.log(maxAuctionsPerQueue, 'Max Auctions Per Queue');
  console.log(availableSlots, 'Available slots');
  console.log(
    activeAuctions.map((value) => value.Name),
    'Active Auctions',
  );
  console.log(
    auctionsInQueue.map((value) => value.Name),
    'Auctions In Queue',
  );

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
  const timeLeft = auction.ExpiresDateTime.getTime() - new Date().getTime();

  setTimeout(async () => {
    await finishAuction(auction, client);
  }, timeLeft);
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

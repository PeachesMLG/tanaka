import {
  ActionRowBuilder,
  ButtonBuilder,
  Client,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { Auction, AuctionStatus } from './types/auction';
import {
  getActiveAuctions,
  getAuctionById,
  saveAuction,
  updateAuction,
} from './database/auctionDatabase';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getForumChannel, getForumPost } from './utils/getChannel';
import { getEmbedImage } from './utils/embeds';
import { getCardImage } from './utils/cardUtils';
import { getPendingAuctionChannel } from './utils/auctionUtils';

export async function createAuction(
  auction: Omit<
    Auction,
    | 'ID'
    | 'PositionInQueue'
    | 'CreatedDateTime'
    | 'ExpiresDateTime'
    | 'ChannelId'
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
    ChannelId: '',
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

export async function approveAuction(auctionId: string, client: Client) {
  const auction = await getAuctionById(parseInt(auctionId));
  if (!auction) return;
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

export async function rejectAuction(auctionId: string) {
  await updateAuction({
    ID: parseInt(auctionId),
    Status: AuctionStatus.REJECTED,
  });
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
}

export async function activateAllAuctions(client: Client) {
  const auctions = await getActiveAuctions();
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

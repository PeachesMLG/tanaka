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
  saveAuction,
  updateAuction,
} from './database/auctionDatabase';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel, getForumChannel } from './utils/getChannel';
import { AuctionCardDetails } from './types/auctionCardDetails';
import { getEmbedImage } from './utils/embeds';

async function getChannelIdForAuctionRarity(
  rarity: string,
  serverId: string,
): Promise<string | undefined> {
  switch (rarity.toLowerCase()) {
    case 'c':
      return await getSetting(serverId, SettingsTypes.C_AUCTION_CHANNEL);
    case 'r':
      return await getSetting(serverId, SettingsTypes.R_AUCTION_CHANNEL);
    case 'sr':
      return await getSetting(serverId, SettingsTypes.SR_AUCTION_CHANNEL);
    case 'ssr':
      return await getSetting(serverId, SettingsTypes.SSR_AUCTION_CHANNEL);
    case 'ur':
      return await getSetting(serverId, SettingsTypes.UR_AUCTION_CHANNEL);
  }
  return undefined;
}

export async function createAuction(auction: Auction, client: Client) {
  const pendingAuctionId = await getSetting(
    auction.ServerId,
    SettingsTypes.APPROVAL_AUCTION_CHANNEL,
  );
  if (!pendingAuctionId) {
    return 'Auctions are not setup on this server!';
  }

  const pendingAuctionChannel = await getChannel(pendingAuctionId, client);
  if (!pendingAuctionChannel) {
    return 'Bot does not have sufficient permissions to post in channel!';
  }

  const auctionDetails = await getAuctionDetails(auction);

  if (!auctionDetails) {
    return 'Unknown card!';
  }

  const auctionChannelId = await getChannelIdForAuctionRarity(
    auctionDetails.rarity,
    auction.ServerId,
  );

  if (!auctionChannelId) {
    return `Auctions are not setup for ${auctionDetails.rarity}`;
  }

  const auctionId = await saveAuction({
    ...auction,
    Rarity: auctionDetails.rarity,
    Series: auctionDetails.seriesName,
    Name: auctionDetails.cardName,
    ChannelId: auctionChannelId,
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
        `${auctionDetails.rarity} ${auctionDetails.cardName} ${auctionDetails.version}`,
        `<@${auction.UserId}> Posted a new Auction`,
        auctionDetails.imageUrl,
      ),
    ],
    components: [row],
  });

  return 'Auction Added to Queue!';
}

export async function getAuctionDetails(
  auction: Auction,
): Promise<AuctionCardDetails | undefined> {
  const imageUrl = `https://cdn3.mazoku.cc/a/750/card/${auction.CardId}.webp`;
  const detailsUrl = `https://server.mazoku.cc/card/catalog/${auction.CardId}`;

  try {
    const res = await fetch(detailsUrl);

    const data = await res.json();

    if (!data.uuid) {
      return undefined;
    }

    return {
      imageUrl,
      cardName: data.name,
      seriesName: data.series?.name,
      rarity: data.rarity?.name,
      eventName: data.type?.name,
      version: auction.Version,
    } as AuctionCardDetails;
  } catch (err) {
    console.error(`Failed to fetch auction details: ${err}`);
    return undefined;
  }
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

  const auctionDetails = await getAuctionDetails(auction);

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
          auctionDetails?.imageUrl ?? '',
        ),
      ],
    },
  });

  await updateAuction(
    parseInt(auctionId),
    AuctionStatus.IN_AUCTION,
    threadPost.id,
    expirationDate,
  );
}

export async function rejectAuction(auctionId: string) {
  await updateAuction(
    parseInt(auctionId),
    AuctionStatus.IN_AUCTION,
    '',
    new Date(),
  );
}

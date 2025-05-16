import {
  ActionRowBuilder,
  ButtonBuilder,
  Client,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { Auction } from './types/auction';
import { saveAuction } from './database/auctionDatabase';
import { getSetting } from './database/settingsDatabase';
import { SettingsTypes } from './SettingsTypes';
import { getChannel } from './utils/getChannel';
import { AuctionCardDetails } from './types/auctionCardDetails';
import { getEmbedImage } from './utils/embeds';

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

  const auctionId = await saveAuction(auction);
  const auctionDetails = await getAuctionDetails(auction);

  if (!auctionDetails) {
    return 'Unknown card!';
  }

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${auctionId}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_${auctionId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger),
    );

  await pendingAuctionChannel.send({
    embeds: [
      getEmbedImage(
        pendingAuctionChannel,
        `${auctionDetails.rarity} ${auctionDetails.cardName} ${auctionDetails.version}`,
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
    if (!res.ok) return undefined;

    const data = await res.json();

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

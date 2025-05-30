import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { AttachmentBuilder, Client } from 'discord.js';
import { getChannel } from './getChannel';
import { Auction } from '../types/auction';

export async function getChannelIdForAuctionRarity(
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

export async function getMaxAuctionsPerQueue(
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

export async function getPendingAuctionChannel(
  serverId: string,
  client: Client,
) {
  const pendingAuctionId = await getSetting(
    serverId,
    SettingsTypes.APPROVAL_AUCTION_CHANNEL,
  );
  if (!pendingAuctionId) {
    return {
      error: 'Auctions are not setup on this server!',
    };
  }

  const pendingAuctionChannel = await getChannel(pendingAuctionId, client);
  if (!pendingAuctionChannel) {
    return {
      error: 'Bot does not have sufficient permissions to post in channel!',
    };
  }

  return {
    channel: pendingAuctionChannel,
  };
}

export async function getQueueAuctionChannel(serverId: string, client: Client) {
  const pendingAuctionId = await getSetting(
    serverId,
    SettingsTypes.QUEUE_AUCTION_CHANNEL,
  );
  if (!pendingAuctionId) return null;

  return await getChannel(pendingAuctionId, client);
}

export async function getAttachments(imageUrl: string) {
  let attachments = [];

  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const urlParts = imageUrl.split('/');
  const fileName = urlParts[urlParts.length - 1] || 'file';

  const attachment = new AttachmentBuilder(buffer, {
    name: fileName,
  });

  attachments.push(attachment);

  return attachments;
}

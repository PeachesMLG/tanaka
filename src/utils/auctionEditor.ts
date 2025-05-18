import { v4 as uuidv4 } from 'uuid';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { getEmbedImageNoGuild } from './embeds';
import { Auction } from '../types/auction';
import { getAttachments } from './auctionUtils';

export type AuctionEditorState = {
  auction: Omit<
    Auction,
    'ID' | 'PositionInQueue' | 'CreatedDateTime' | 'ExpiresDateTime'
  >;
  interaction: ChatInputCommandInteraction;
};

const auctionMap = new Map<string, AuctionEditorState>();

export async function storeAuction(auction: AuctionEditorState) {
  const guid = uuidv4();
  auctionMap.set(guid, auction);

  await auction.interaction.reply({
    ...((await getReply(auction, guid)) as InteractionReplyOptions),
    ephemeral: true,
  });
}

export function getAuction(guid: string): AuctionEditorState | undefined {
  return auctionMap.get(guid);
}

export async function editState(guid: string, partial: Partial<Auction>) {
  const existing = auctionMap.get(guid);
  if (!existing) return;

  const updated: AuctionEditorState = {
    ...existing,
    auction: {
      ...existing.auction,
      ...partial,
    },
  };

  auctionMap.set(guid, updated);

  await updated.interaction.editReply({
    ...((await getReply(updated, guid)) as InteractionEditReplyOptions),
  });
}

function createAuctionEditorRows(
  guid: string,
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`auction_submit_${guid}`)
      .setLabel('Submit')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`auction_cancel_${guid}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`auction_edit_${guid}`)
      .setLabel('Edit Auction Card')
      .setStyle(ButtonStyle.Primary),
  );
}

async function getReply(
  auction: AuctionEditorState,
  guid: string,
): Promise<InteractionEditReplyOptions | InteractionReplyOptions> {
  return {
    embeds: [
      getEmbedImageNoGuild(
        `${auction.auction.Rarity} ${auction.auction.Name} Version ${auction.auction.Version}`,
        `<@${auction.auction.UserId}> Posted a new Auction`,
        auction.auction.ImageUrl,
      ),
    ],
    files: await getAttachments(auction.auction),
    components: [createAuctionEditorRows(guid)],
  };
}

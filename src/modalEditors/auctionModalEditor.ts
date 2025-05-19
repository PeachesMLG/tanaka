import { ModalEditor, ModalEditorValues } from './modalEditor';
import {
  ActionRowBuilder,
  ButtonBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { getEmbedImageNoGuild } from '../utils/embeds';
import { getAttachments } from '../utils/auctionUtils';

export type AuctionEditorValues = {
  CardName: string;
  CardRarity: string;
  CardVersion: string;
  CardImage: string;
  CardSeries: string;
  CurrencyPreference: string;
  ServerId: string;
  UserId: string;
  CardId: string;
  ChannelId: string;
};

export class AuctionModalEditor extends ModalEditor<AuctionEditorValues> {
  constructor() {
    super('Edit Auction Card');
  }

  override toLabel(key: string): string | undefined {
    switch (key) {
      case 'CardName':
        return 'Card Name';
      case 'CardRarity':
        return 'Card Rarity';
      case 'CardVersion':
        return 'Card Version';
      case 'CurrencyPreference':
        return 'Currency Preferences';
      case 'CardImage':
        return 'Card Image';
    }
    return undefined;
  }

  override async getReply(
    auction: ModalEditorValues<AuctionEditorValues>,
    guid: string,
    userId: string,
  ): Promise<InteractionEditReplyOptions | InteractionReplyOptions> {
    const rows =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
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

    return {
      embeds: [
        getEmbedImageNoGuild(
          `${auction.object.CardRarity} ${auction.object.CardName} Version ${auction.object.CardVersion}`,
          `<@${userId}> Posted a new Auction`,
          auction.object.CardImage,
        ),
      ],
      files: await getAttachments(auction.object.CardImage),
      components: [rows],
    };
  }

  override getId(guid: string): string {
    return `auction_modal_edit_${guid}`;
  }
}

export const auctionModalEditor = new AuctionModalEditor();

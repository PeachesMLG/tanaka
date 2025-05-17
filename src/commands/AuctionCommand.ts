import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SharedSlashCommand,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { Auction, AuctionStatus } from '../types/auction';
import { createAuction } from '../auctions';
import { getAuctions } from '../database/auctionDatabase';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { getCardDetails } from '../utils/cardUtils';
import { getChannelIdForAuctionRarity } from '../utils/auctionUtils';
import { QueueType } from '../types/queueType';

export class AuctionCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('auction')
      .setDescription('Auction related commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('create')
          .setDescription('Create a new auction')
          .addStringOption((option) =>
            option
              .setName('card')
              .setDescription('The ID of the card')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('version')
              .setDescription('The Version of the card')
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('list')
          .setDescription('Lists your current auctions'),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Cannot execute command outside a Guild',
      });
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();
    const start = Date.now();

    if (subcommand === 'create') {
      await this.createAuction(interaction, client);
    } else if (subcommand === 'list') {
      await this.ListAuctions(interaction, client);
    }

    const duration = Date.now() - start;
    console.log(
      `[Command Timing] Subcommand "${subcommand}" took ${duration}ms`,
    );
  }

  async createAuction(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) {
    const cardId = interaction.options.getString('card');
    const version = interaction.options.getString('version');

    if (!cardId || !version) {
      await interaction.reply({
        content: 'You must set both CardId and Version',
        ephemeral: true,
      });
      return;
    }

    const cardDetails = await getCardDetails(cardId);

    if (!cardDetails) {
      await interaction.reply({
        content: 'Unknown Card!',
        ephemeral: true,
      });
      return;
    }

    const maxAuctionsPerUser = parseInt(
      (await getSetting(
        interaction.guild!.id,
        SettingsTypes.MAX_AUCTIONS_PER_USER,
      )) ?? '1',
    );

    const currentUserAuctions = await getAuctions(
      interaction.guild!.id,
      interaction.user.id,
    );

    if (currentUserAuctions.length >= maxAuctionsPerUser) {
      await interaction.reply({
        content: `You already have ${currentUserAuctions.length} Auctions, max is ${maxAuctionsPerUser}`,
        ephemeral: true,
      });
      return;
    }

    const channelId = await getChannelIdForAuctionRarity(
      cardDetails.rarity,
      interaction.guild!.id,
    );

    if (!channelId) {
      await interaction.reply({
        content: `${cardDetails.rarity} Cards are not setup for auction`,
        ephemeral: true,
      });
      return;
    }

    const result = await createAuction(
      {
        ServerId: interaction.guild!.id,
        UserId: interaction.user.id,
        CardId: cardId,
        Version: version,
        Status: AuctionStatus.PENDING,
        Rarity: cardDetails.rarity,
        Series: cardDetails.seriesName,
        Name: cardDetails.cardName,
        ThreadId: '',
        QueueMessageId: '',
        ChannelId: channelId,
        QueueType: QueueType.Regular,
      },
      client,
    );

    await interaction.reply({
      content: result,
      ephemeral: true,
    });
  }

  async ListAuctions(interaction: ChatInputCommandInteraction, _: Client) {
    const auctions = await getAuctions(
      interaction.guild!.id,
      interaction.user.id,
    );
    const channel = interaction.channel as TextChannel;

    const fields = await Promise.all(
      auctions.map(async (claimCount) => {
        return await this.getAuctionField(claimCount);
      }),
    );

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Your Auctions',
          fields.length === 0 ? 'No auctions found.' : fields.join('\n'),
        ),
      ],
    });
  }

  async getAuctionField(auction: Auction) {
    const unixTimestamp = Math.floor(auction.ExpiresDateTime.getTime() / 1000);
    let message = `${auction.Rarity} • ${auction.Name} • Version ${auction.Version}`;
    if (auction.Status === AuctionStatus.IN_AUCTION) {
      message = message + `: Expires: <t:${unixTimestamp}:R>`;
    }
    if (auction.Status === AuctionStatus.IN_QUEUE) {
      message = message + `: Position #${auction.PositionInQueue}`;
    }
    if (auction.Status === AuctionStatus.PENDING) {
      message = message + `: Pending Approval`;
    }

    return message;
  }
}

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
              .setName('cardId')
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

    if (subcommand === 'create') {
      await this.createAuction(interaction, client);
    } else if (subcommand === 'list') {
      await this.ListAuctions(interaction, client);
    }
  }

  async createAuction(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) {
    const cardId = interaction.options.getString('cardId');
    const version = interaction.options.getString('version');

    if (!cardId || !version) {
      await interaction.reply({
        content: 'You must set both CardId and Version',
        ephemeral: true,
      });

      return;
    }

    const maxAuctionsPerUser =
      (await getSetting(
        interaction.guild!.id,
        SettingsTypes.MAX_AUCTIONS_PER_USER,
      )) ?? '1';
    const currentUserAuctions = await getAuctions(
      interaction.guild!.id,
      interaction.user.id,
    );

    if (currentUserAuctions.length > parseInt(maxAuctionsPerUser)) {
      await interaction.reply({
        content: `You already have ${currentUserAuctions.length} Auctions, max is ${maxAuctionsPerUser}`,
        ephemeral: true,
      });
      return;
    }

    const auction = {
      ID: 0,
      ServerId: interaction.guild!.id,
      UserId: interaction.user.id,
      CardId: cardId,
      Version: version,
      Status: AuctionStatus.PENDING,
      CreatedDateTime: new Date(),
      ExpiresDateTime: new Date(),
    } as Auction;

    const result = await createAuction(auction, client);

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
    let message = `${auction.Rarity} • ${auction.Name} • ${auction.Version}`;
    if (auction.Status === AuctionStatus.IN_AUCTION) {
      message = message + `: Expires: <t:${unixTimestamp}:R>`;
    }
    if (auction.Status === AuctionStatus.IN_QUEUE) {
      message = `Position #${auction.PositionInQueue}` + message;
    }

    return message;
  }
}

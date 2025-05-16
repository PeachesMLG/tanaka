import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SharedSlashCommand,
  SlashCommandBuilder,
} from 'discord.js';
import { Auction, AuctionStatus } from '../types/auction';
import { createAuction } from '../auctions';

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
    const cardId = interaction.options.getString('card');
    const version = interaction.options.getString('version');

    if (!cardId || !version) {
      await interaction.reply({
        content: 'You must set both CardId and Version',
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
      DateTime: new Date(),
    } as Auction;

    const result = await createAuction(auction, client);

    await interaction.reply({
      content: result,
      ephemeral: true,
    });
  }

  async ListAuctions(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.reply({
      content: 'Listing your auctions.',
      ephemeral: true,
    });
  }
}

import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SharedSlashCommand,
} from 'discord.js';

export class AuctionCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('auction')
      .setDescription('Auction-related commands')
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
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      await this.createAuction(interaction);
    } else if (subcommand === 'list') {
      await this.ListAuctions(interaction);
    }
  }

  async createAuction(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Creating a new one auction.',
      ephemeral: true,
    });
  }

  async ListAuctions(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: 'Listing your auctions.',
      ephemeral: true,
    });
  }
}

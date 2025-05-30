import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
  Client,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting, saveSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { getAuctionsByState } from '../database/auctionDatabase';
import { AuctionStatus } from '../types/auction';
import { startNextAuctions } from '../auctions';

export class ServerSettingsCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('server')
      .setDescription('Server related commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('settings')
          .setDescription('Modify your user settings')
          .addStringOption((option) =>
            option
              .setName('setting')
              .setDescription('The setting you want to modify')
              .setRequired(false)
              .addChoices([
                {
                  name: 'High Tier Ping Role',
                  value: SettingsTypes.HIGH_TIER_PING_ROLE,
                },
                {
                  name: 'High Tier Ping Message',
                  value: SettingsTypes.HIGH_TIER_PING_MESSAGE,
                },
                {
                  name: 'Common Auction Channel',
                  value: SettingsTypes.C_AUCTION_CHANNEL,
                },
                {
                  name: 'Rare Auction Channel',
                  value: SettingsTypes.R_AUCTION_CHANNEL,
                },
                {
                  name: 'Super Rare Auction Channel',
                  value: SettingsTypes.SR_AUCTION_CHANNEL,
                },
                {
                  name: 'Super Super Rare Auction Channel',
                  value: SettingsTypes.SSR_AUCTION_CHANNEL,
                },
                {
                  name: 'Ultra Rare Auction Channel',
                  value: SettingsTypes.UR_AUCTION_CHANNEL,
                },
                {
                  name: 'Approval Auction Channel',
                  value: SettingsTypes.APPROVAL_AUCTION_CHANNEL,
                },
                {
                  name: 'Queue Auction Channel',
                  value: SettingsTypes.QUEUE_AUCTION_CHANNEL,
                },
                {
                  name: 'Max Auctions Per User',
                  value: SettingsTypes.MAX_AUCTIONS_PER_USER,
                },
                {
                  name: 'Max Common Auctions Per Queue',
                  value: SettingsTypes.MAX_C_AUCTIONS_PER_QUEUE,
                },
                {
                  name: 'Max Rare Auctions Per Queue',
                  value: SettingsTypes.MAX_R_AUCTIONS_PER_QUEUE,
                },
                {
                  name: 'Max Super Rare Auctions Per Queue',
                  value: SettingsTypes.MAX_SR_AUCTIONS_PER_QUEUE,
                },
                {
                  name: 'Max Super Super Rare Auctions Per Queue',
                  value: SettingsTypes.MAX_SSR_AUCTIONS_PER_QUEUE,
                },
                {
                  name: 'Max Ultra Rare Auctions Per Queue',
                  value: SettingsTypes.MAX_UR_AUCTIONS_PER_QUEUE,
                },
                {
                  name: 'Auction Lifetime (Minutes)',
                  value: SettingsTypes.AUCTION_LIFETIME_MINUTES,
                },
              ]),
          )
          .addStringOption((option) =>
            option
              .setName('value')
              .setDescription('Value of the setting')
              .setRequired(false),
          ),
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

    if (subcommand !== 'settings') return;

    const member = interaction.member;
    if (!member || !('permissions' in member)) {
      await interaction.reply({
        content: 'Cannot determine your permissions.',
        ephemeral: true,
      });
      return;
    }

    const permissions = member.permissions as Readonly<PermissionsBitField>;

    if (!permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You must have Administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value') ?? '';

    if (setting == null) {
      await interaction.reply({
        embeds: [getEmbedMessage(channel, 'Error!', `Setting must be set.`)],
        ephemeral: true,
      });
      return;
    }

    await saveSetting(interaction.guild.id, setting, value);

    if (setting.includes('Auctions Per Queue')) {
      const auctionsInQueue = await getAuctionsByState(
        AuctionStatus.IN_QUEUE,
        interaction.guild.id,
      );
      await Promise.all(
        Array.from(
          new Set(auctionsInQueue.map((a) => `${a.ServerId}|${a.Rarity}`)),
        ).map((key) => {
          const [ServerId, Rarity] = key.split('|');
          return startNextAuctions(ServerId, Rarity, client);
        }),
      );
    }

    const result = (await getSetting(interaction.guild.id, setting)) ?? '';

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Server Setting changed!',
          `${setting} set to \"${result}\".`,
        ),
      ],
      ephemeral: true,
    });
  }
}

import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getTopClaimers } from '../database/recentClaimsDatabase';
import { ClaimCount } from '../types/claimCount';

export class TopClaimersCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('top')
      .setDescription('Top related commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('claimers')
          .setDescription('Get the top 10 claimers in your server.')
          .addStringOption((option) =>
            option
              .setName('duration')
              .setDescription('The duration of the claims')
              .addChoices([
                { name: 'Today', value: 'DAILY' },
                { name: 'This Week', value: 'WEEKLY' },
                { name: 'This Month', value: 'MONTHLY' },
                { name: 'This Year', value: 'YEARLY' },
              ])
              .setRequired(false),
          ),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== 'claimers') return;

    const start = Date.now();

    const value = interaction.options.getString('duration') ?? 'MONTHLY';

    const channel = interaction.channel as TextChannel;

    const topClaimers = await getTopClaimers(
      channel.guildId,
      this.getStartDate(value),
      new Date(),
    );
    const yourClaims =
      topClaimers.filter((value) => value.UserID === interaction.user.id)[0] ||
      undefined;

    const leaderboardFields = await Promise.all(
      topClaimers.slice(0, 10).map(async (claimCount) => {
        return await this.getTopClaimField(claimCount, interaction.client);
      }),
    );

    const yourStatsFields = [
      '**Your Statistics**',
      `Cards Claimed: **${yourClaims?.ClaimCount ?? 0}** | Position: **#${yourClaims?.Rank ?? 'N/A'}**`,
    ];

    const fields = [
      ...(leaderboardFields.length === 0
        ? ['No recent claims found.']
        : leaderboardFields),
      '',
      ...yourStatsFields,
    ];

    await interaction.reply({
      embeds: [
        getEmbedMessage(channel, this.getHeader(value), fields.join('\n')),
      ],
    });

    const duration = Date.now() - start;
    console.log(
      `[Command Timing] Subcommand "${subcommand}" took ${duration}ms`,
    );
  }

  async getTopClaimField(claimCount: ClaimCount, client: Client) {
    return `${claimCount.Rank}. • <@${claimCount.UserID}> • **${claimCount.ClaimCount} Cards Claimed**`;
  }

  getStartDate(duration?: string) {
    const now = new Date();
    switch (duration) {
      case 'DAILY':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'WEEKLY':
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        return monday;
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'YEARLY':
        return new Date(now.getFullYear(), 1, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  getHeader(duration?: string) {
    switch (duration) {
      case 'DAILY':
        return 'Top Claimers today';
      case 'WEEKLY':
        return 'Top Claimers this week';
      case 'MONTHLY':
        return 'Top Claimers this month';
      case 'YEARLY':
        return 'Top Claimers this year';
      default:
        return 'Top Claimers this month';
    }
  }
}

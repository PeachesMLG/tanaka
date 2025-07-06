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
                { name: 'Yesterday', value: 'YESTERDAY' },
                { name: 'This Week', value: 'WEEKLY' },
                { name: 'Last Week', value: 'LAST_WEEK' },
                { name: 'This Month', value: 'MONTHLY' },
                { name: 'Last Month', value: 'LAST_MONTH' },
                { name: 'This Year', value: 'YEARLY' },
                { name: 'Last Year', value: 'LAST_YEAR' },
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (duration) {
      case 'DAILY':
        return today;
      case 'YESTERDAY': {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday;
      }
      case 'WEEKLY':
        return this.getMonday(today);
      case 'LAST_WEEK': {
        const lastWeekMonday = this.getMonday(today);
        lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
        return lastWeekMonday;
      }
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'LAST_MONTH': {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstOfThisMonth.setMonth(firstOfThisMonth.getMonth() - 1);
        return firstOfThisMonth;
      }
      case 'YEARLY':
        return new Date(now.getFullYear(), 0, 1);
      case 'LAST_YEAR':
        return new Date(now.getFullYear() - 1, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getHeader(duration?: string) {
    switch (duration) {
      case 'DAILY':
        return 'Top Claimers today';
      case 'YESTERDAY':
        return 'Top Claimers yesterday';
      case 'WEEKLY':
        return 'Top Claimers this week';
      case 'LAST_WEEK':
        return 'Top Claimers last week';
      case 'MONTHLY':
        return 'Top Claimers this month';
      case 'LAST_MONTH':
        return 'Top Claimers last month';
      case 'YEARLY':
        return 'Top Claimers this year';
      case 'LAST_YEAR':
        return 'Top Claimers last year';
      default:
        return 'Top Claimers this month';
    }
  }
}

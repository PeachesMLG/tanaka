import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import {
  getTopClaimers,
  getTopServers,
} from '../database/recentClaimsDatabase';
import {
  getTopLeaderboard,
  getUserLeaderboardPosition,
} from '../database/leaderboardDatabase';
import { LeaderboardType } from '../types/leaderboardType';
import { ClaimCount } from '../types/claimCount';
import { ServerClaimCount } from '../types/serverClaimCount';

const validServerIds = [
  '1293611593845706793',
  '1069709761026728009',
  '1222204521296691260',
  '1139035907282972794',
  '813217659772076043',
];

export class TopCommand implements Command {
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
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('servers')
          .setDescription('Get the top 10 servers by claims.')
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
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('summons')
          .setDescription('Get the top 10 clan summoners and your position.'),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'claimers')
      await this.executeTopClaimersCommand(interaction, client);
    if (subcommand === 'servers')
      await this.executeTopServersCommand(interaction, client);
    if (subcommand === 'summons')
      await this.executeTopSummonsCommand(interaction, client);
  }

  async executeTopClaimersCommand(
    interaction: ChatInputCommandInteraction,
    _: Client,
  ) {
    const value = interaction.options.getString('duration') ?? 'MONTHLY';

    const channel = interaction.channel as TextChannel;

    const topClaimers = await getTopClaimers(
      channel.guildId,
      this.getStartDate(value),
      this.getEndDate(value),
    );

    const leaderboardFields = await Promise.all(
      topClaimers.slice(0, 10).map(async (claimCount) => {
        return await this.getTopClaimersField(claimCount, interaction.client);
      }),
    );

    const fields =
      leaderboardFields.length === 0
        ? ['No recent claims found.']
        : leaderboardFields;

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          this.getHeader('Claimers', value),
          fields.join('\n'),
        ),
      ],
    });
  }

  async executeTopServersCommand(
    interaction: ChatInputCommandInteraction,
    _: Client,
  ) {
    const value = interaction.options.getString('duration') ?? 'MONTHLY';

    const channel = interaction.channel as TextChannel;

    const topClaimers = await getTopServers(
      this.getStartDate(value),
      this.getEndDate(value),
    );

    const leaderboardFields = await Promise.all(
      topClaimers
        .filter((serverClaimCount) =>
          validServerIds.includes(serverClaimCount.ServerId),
        )
        .slice(0, 10)
        .map(async (claimCount) => {
          return await this.getTopServersField(claimCount, interaction.client);
        }),
    );

    const fields =
      leaderboardFields.length === 0
        ? ['No recent claims found.']
        : leaderboardFields;

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          this.getHeader('Servers', value),
          fields.join('\n'),
        ),
      ],
    });
  }

  async executeTopSummonsCommand(
    interaction: ChatInputCommandInteraction,
    _: Client,
  ) {
    const channel = interaction.channel as TextChannel;
    const userId = interaction.user.id;

    const topSummoners = await getTopLeaderboard(LeaderboardType.CLAN_SUMMON, 10);
    const userPosition = await getUserLeaderboardPosition(userId, LeaderboardType.CLAN_SUMMON);

    const leaderboardFields = topSummoners.map((summoner, index) => {
      return `${index + 1}. • <@${summoner.UserId}> • **${summoner.Amount} Summons**`;
    });

    let userPositionText = '';
    if (userPosition) {
      userPositionText = `\n\n**Your Position:**\n${userPosition.position}. • <@${userId}> • **${userPosition.amount} Summons**`;
    } else {
      userPositionText = `\n\n**Your Position:**\nNot ranked yet - perform your first summon!`;
    }

    const fields = leaderboardFields.length === 0
      ? ['No summons found yet.']
      : leaderboardFields;

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Top Clan Summoners',
          fields.join('\n') + userPositionText,
        ),
      ],
    });
  }

  async getTopServersField(claimCount: ServerClaimCount, client: Client) {
    const guild = await client.guilds.fetch(claimCount.ServerId);
    return `${claimCount.Rank}. • ${guild.name} • **${claimCount.ClaimCount} Cards Claimed**`;
  }

  async getTopClaimersField(claimCount: ClaimCount, client: Client) {
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

  getEndDate(duration?: string) {
    const now = new Date();

    switch (duration) {
      case 'DAILY':
        return now;
      case 'YESTERDAY': {
        return this.getStartDate('DAILY');
      }
      case 'WEEKLY':
        return now;
      case 'LAST_WEEK': {
        return this.getStartDate('WEEKLY');
      }
      case 'MONTHLY':
        return now;
      case 'LAST_MONTH': {
        return this.getStartDate('MONTHLY');
      }
      case 'YEARLY':
        return now;
      case 'LAST_YEAR':
        return this.getStartDate('YEARLY');
      default:
        return now;
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

  getHeader(type: string, duration?: string) {
    switch (duration) {
      case 'DAILY':
        return `Top ${type} today`;
      case 'YESTERDAY':
        return `Top ${type} yesterday`;
      case 'WEEKLY':
        return `Top ${type} this week`;
      case 'LAST_WEEK':
        return `Top ${type} last week`;
      case 'MONTHLY':
        return `Top ${type} this month`;
      case 'LAST_MONTH':
        return `Top ${type} last month`;
      case 'YEARLY':
        return `Top ${type} this year`;
      case 'LAST_YEAR':
        return `Top ${type} last year`;
      default:
        return `Top ${type} this month`;
    }
  }
}

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
          .setDescription('Get the top 10 claimers in your server.'),
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

    const channel = interaction.channel as TextChannel;
    const topClaimers = await getTopClaimers(channel.guildId);
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
        getEmbedMessage(channel, 'Top Claimers this month', fields.join('\n')),
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
}

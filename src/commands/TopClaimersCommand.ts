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

    const channel = interaction.channel as TextChannel;
    const topClaimers = await getTopClaimers(channel.guildId);

    const fields = await Promise.all(
      topClaimers.map(async (claimCount) => {
        return await this.getTopClaimField(claimCount, interaction.client);
      }),
    );

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Top Claimers this month',
          fields.length === 0 ? 'No recent claims found.' : fields.join('\n'),
        ),
      ],
    });
  }

  async getTopClaimField(claimCount: ClaimCount, client: Client) {
    const user = await client.users.fetch(claimCount.UserID);
    const userName = user.username;

    return `#${claimCount.Rank} • ${userName} • **${claimCount.ClaimCount} Cards Claimed**`;
  }
}

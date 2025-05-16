import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting, saveSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';
import { getTopClaimers } from '../database/recentClaimsDatabase';
import { CardClaim } from '../types/cardClaim';
import { mapTierToEmoji } from '../utils/emojis';
import { ClaimCount } from '../types/claimCount';

export class TopClaimersCommand implements Command {
  command: SlashCommandOptionsOnlyBuilder;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('topclaimers')
      .setDescription('Get the top 10 claimers in your server.');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

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
          'Recent Claims',
          fields.length === 0 ? 'No recent claims found.' : fields.join('\n'),
        ),
      ],
    });
  }

  async getTopClaimField(claimCount: ClaimCount, client: Client) {
    const user = await client.users.fetch(claimCount.UserID);
    const userName = user.username;

    return `#${claimCount.Rank} • ${userName} • **${claimCount.ClaimedCards} Cards Claimed**`;
  }
}

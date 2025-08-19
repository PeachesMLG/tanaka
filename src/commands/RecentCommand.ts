import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
} from 'discord.js';
import { getRecentClaims } from '../database/recentClaimsDatabase';
import { getEmbedMessage } from '../utils/embeds';
import { CardClaim } from '../types/cardClaim';
import { mapTierToEmoji } from '../utils/emojis';

export class RecentCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('recent')
      .setDescription('See Recent Spawns')
      .addStringOption((option) =>
        option
          .setName('tier')
          .setDescription('The tier of the card')
          .setRequired(false)
          .addChoices(
            { name: 'C', value: 'C' },
            { name: 'R', value: 'R' },
            { name: 'SR', value: 'SR' },
            { name: 'SSR', value: 'SSR' },
            { name: 'UR', value: 'UR' },
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName('version')
          .setDescription('The maximum version of the card')
          .setRequired(false),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const tier = interaction.options.getString('tier');
    const version = interaction.options.getInteger('version');

    const recentClaims = await getRecentClaims(
      interaction.guildId ?? '',
      tier ?? undefined,
      version ?? undefined,
    );

    const fields = await Promise.all(
      recentClaims.map(async (claim) => {
        return await this.getRecentClaimField(claim, interaction.client);
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

  async getRecentClaimField(claim: CardClaim, client: Client) {
    const discordTimestamp = `<t:${Math.floor(claim.DateTime.getTime() / 1000)}:R>`;

    const user = await client.users.fetch(claim.UserID);
    const userName = user.username;

    return `${mapTierToEmoji(claim.CardItem.Details.Rarity)} • **${discordTimestamp}** • #${claim.CardItem.Version} • **${claim.CardItem.Details.CardName}** • ${userName}`;
  }
}

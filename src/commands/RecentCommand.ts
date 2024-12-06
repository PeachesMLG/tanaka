import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextChannel,
} from 'discord.js';
import { getRecentSpawns } from '../database';
import { Card } from '../types/websocketMessage';
import { getEmbedMessage } from '../utils/embeds';
import { RecentClaim } from '../types/recentClaim';
import { mapEmoji } from '../utils/emojis';

export class RecentCommand implements Command {
  command: SlashCommandOptionsOnlyBuilder;

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
          ),
      )
      .addIntegerOption((option) =>
        option
          .setName('version')
          .setDescription('The maximum version of the card')
          .setRequired(false),
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const tier = interaction.options.getString('tier');
    const version = interaction.options.getInteger('version');

    const recentSpawns = await getRecentSpawns(
      interaction.channel?.id ?? '',
      tier ?? undefined,
      version ?? undefined,
    );

    const fields = await Promise.all(
      recentSpawns.map(async (claim) => {
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

  async getRecentClaimField(claim: RecentClaim, client: Client) {
    const discordTimestamp = `<t:${Math.floor(claim.dateTime.getTime() / 1000)}:R>`;

    let userName = 'N/A';

    if (claim.userClaimed) {
      const user = await client.users.fetch(claim.userClaimed);
      userName = user.username;
    }
    const cards = JSON.parse(claim.cards) as Card[];
    const tier = cards[0].tier;

    if (claim.status === 'claimed') {
      return `${mapEmoji(claim.claimedCard.tier)} • **${discordTimestamp}** • #${claim.claimedVersion} • **${claim.claimedCard.name}** • ${userName}`;
    } else if (claim.status === 'active') {
      return `${tier} • **${discordTimestamp}** Pending`;
    } else {
      return `${tier} • **${discordTimestamp}** Despawned :c`;
    }
  }
}

import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getUserTimers } from '../database/timerDatabase';

export class TimersCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('timers')
      .setDescription('List all your active timers');
  }

  async execute(interaction: ChatInputCommandInteraction, _: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const userId = interaction.user.id;

    const userTimers = await getUserTimers(userId);

    if (userTimers.length === 0) {
      await interaction.reply({
        embeds: [
          getEmbedMessage(
            channel,
            'Your Timers',
            'You have no active timers.',
          ),
        ],
      });
      return;
    }

    const timerFields = userTimers.map((timer, index) => {
      const timestamp = `<t:${Math.floor(timer.Time.getTime() / 1000)}:R>`;
      const reason = timer.Reason || 'No reason provided';
      
      return `${index + 1}. **${reason}**\n   • ${timestamp}`;
    });

    const description = timerFields.join('\n\n');

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          `Your Timers (${userTimers.length})`,
          description,
        ),
      ],
    });
  }
}
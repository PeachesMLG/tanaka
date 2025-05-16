import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextChannel,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import {
  getUserSetting,
  saveUserSetting,
} from '../database/userSettingsDatabase';
import { UserSettingsTypes } from '../UserSettingsTypes';

export class UserSettingsCommand implements Command {
  command: SlashCommandOptionsOnlyBuilder;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('usersettings')
      .setDescription('Modify your user settings')
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('The setting you want to modify')
          .setRequired(true)
          .addChoices({
            name: 'Automatic Summon Timers',
            value: UserSettingsTypes.AUTOMATIC_SUMMON_TIMERS,
          }),
      )
      .addBooleanOption((option) =>
        option
          .setName('enabled')
          .setDescription('Enable/Disable the setting')
          .setRequired(true),
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
    const setting = interaction.options.getString('setting');
    const enabled = interaction.options.getBoolean('enabled');

    if (setting == null || enabled == null) {
      await interaction.reply({
        embeds: [
          getEmbedMessage(
            channel,
            'Error!',
            `Both setting and enabled must be set.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await saveUserSetting(interaction.user.id, setting, enabled);

    const result = await getUserSetting(interaction.user.id, setting);

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Setting changed!',
          `${result ? 'Enabled' : 'Disabled'} ${setting}.`,
        ),
      ],
      ephemeral: true,
    });
  }
}

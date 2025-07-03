import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
  Client,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting, saveSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';

export class UserSettingsCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('user')
      .setDescription('User related commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('settings')
          .setDescription('Modify your user settings')
          .addStringOption((option) =>
            option
              .setName('setting')
              .setDescription('The setting you want to modify')
              .setRequired(true)
              .addChoices([
                {
                  name: 'Automatic Summon Timers',
                  value: SettingsTypes.AUTOMATIC_SUMMON_TIMERS,
                },
                {
                  name: 'Automatic Event Box Timers',
                  value: SettingsTypes.AUTOMATIC_EVENT_BOX_TIMERS,
                },
              ]),
          )
          .addBooleanOption((option) =>
            option
              .setName('enabled')
              .setDescription('Enable/Disable the setting')
              .setRequired(true),
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

    await saveSetting(interaction.user.id, setting, enabled ? 'true' : 'false');

    const result = (await getSetting(interaction.user.id, setting)) ?? '';

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'User Setting changed!',
          `${setting} set to \"${result}\".`,
        ),
      ],
      ephemeral: true,
    });
  }
}

import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
  Client,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting, saveSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';

export class ServerSettingsCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('server')
      .setDescription('Server related commands')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('settings')
          .setDescription('Modify your user settings')
          .addStringOption((option) =>
            option
              .setName('setting')
              .setDescription('The setting you want to modify')
              .setRequired(false)
              .addChoices([
                {
                  name: 'High Tier Ping Role',
                  value: SettingsTypes.HIGH_TIER_PING_ROLE,
                },
                {
                  name: 'High Tier Ping Message',
                  value: SettingsTypes.HIGH_TIER_PING_MESSAGE,
                },
              ]),
          )
          .addStringOption((option) =>
            option
              .setName('value')
              .setDescription('Value of the setting')
              .setRequired(false),
          ),
      );
  }

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Cannot execute command outside a Guild',
      });
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== 'settings') return;

    const member = interaction.member;
    if (!member || !('permissions' in member)) {
      await interaction.reply({
        content: 'Cannot determine your permissions.',
        ephemeral: true,
      });
      return;
    }

    const permissions = member.permissions as Readonly<PermissionsBitField>;

    if (!permissions.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You must have Administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value') ?? '';

    if (setting == null) {
      await interaction.reply({
        embeds: [getEmbedMessage(channel, 'Error!', `Setting must be set.`)],
        ephemeral: true,
      });
      return;
    }

    await saveSetting(interaction.guild.id, setting, value);

    const result = (await getSetting(interaction.guild.id, setting)) ?? '';

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Server Setting changed!',
          `${setting} set to \"${result}\".`,
        ),
      ],
      ephemeral: true,
    });
  }
}

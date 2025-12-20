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
                  name: 'Common Tier Ping Role',
                  value: SettingsTypes.COMMON_TIER_PING_ROLE,
                },
                {
                  name: 'Rare Tier Ping Role',
                  value: SettingsTypes.RARE_TIER_PING_ROLE,
                },
                {
                  name: 'SR Tier Ping Role',
                  value: SettingsTypes.SR_TIER_PING_ROLE,
                },
                {
                  name: 'SSR Tier Ping Role',
                  value: SettingsTypes.SSR_TIER_PING_ROLE,
                },
                {
                  name: 'UR Tier Ping Role',
                  value: SettingsTypes.UR_TIER_PING_ROLE,
                },
                {
                  name: 'Enable Automatic Timers as Default',
                  value: SettingsTypes.ENABLE_AUTOMATIC_TIMERS_AS_DEFAULT,
                },
              ]),
          )
          .addStringOption((option) =>
            option
              .setName('value')
              .setDescription('Value of the setting')
              .setRequired(false),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('bulk-update')
          .setDescription('Update multiple settings at once using JSON')
          .addStringOption((option) =>
            option
              .setName('json')
              .setDescription('JSON object with setting keys and values')
              .setRequired(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName('spell-template')
          .setDescription('Generate a JSON template for spell priorities'),
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

    if (subcommand === 'settings') {
      await this.handleSingleSetting(interaction, client);
    } else if (subcommand === 'bulk-update') {
      await this.handleBulkUpdate(interaction, client);
    } else if (subcommand === 'spell-template') {
      await this.handleSpellTemplate(interaction, client);
    }
  }

  private async handleSingleSetting(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel || !interaction.guild) return;

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

  private async handleBulkUpdate(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel || !interaction.guild) return;

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
    const jsonString = interaction.options.getString('json', true);

    let settingsObject: Record<string, string>;
    try {
      settingsObject = JSON.parse(jsonString);
    } catch (error) {
      await interaction.reply({
        embeds: [
          getEmbedMessage(
            channel,
            'Error!',
            'Invalid JSON format. Please provide a valid JSON object.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const validSettings = Object.values(SettingsTypes);
    const invalidSettings = Object.keys(settingsObject).filter(
      (key) => !validSettings.includes(key as SettingsTypes),
    );

    if (invalidSettings.length > 0) {
      await interaction.reply({
        embeds: [
          getEmbedMessage(
            channel,
            'Error!',
            `Invalid settings found: ${invalidSettings.join(', ')}\n\nUse \`/spell-priorities\` to see valid spell priority settings.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const results: string[] = [];
    for (const [setting, value] of Object.entries(settingsObject)) {
      await saveSetting(interaction.guild.id, setting, value);
      results.push(`${setting}: "${value}"`);
    }

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Bulk Settings Updated!',
          `Successfully updated ${results.length} settings:\n\n${results.join('\n')}`,
        ),
      ],
      ephemeral: true,
    });
  }

  private async handleSpellTemplate(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel || !interaction.guild) return;

    const channel = interaction.channel as TextChannel;

    // Define spell settings with their default values
    const spellSettings = [
      { setting: SettingsTypes.PHOENIX_REVIVAL_PRIORITY, default: "1" },
      { setting: SettingsTypes.DIVINE_AEGIS_PRIORITY, default: "2" },
      { setting: SettingsTypes.CHAOS_ORB_PRIORITY, default: "3" },
      { setting: SettingsTypes.LIFE_SURGE_PRIORITY, default: "4" },
      { setting: SettingsTypes.MIRROR_FORCE_PRIORITY, default: "5" },
      { setting: SettingsTypes.INFERNO_BLAST_PRIORITY, default: "6" },
      { setting: SettingsTypes.REGENERATION_PRIORITY, default: "7" },
      { setting: SettingsTypes.MYSTIC_WARD_PRIORITY, default: "8" },
      { setting: SettingsTypes.LIGHTNING_STRIKE_PRIORITY, default: "9" },
      { setting: SettingsTypes.HEALING_LIGHT_PRIORITY, default: "10" },
      { setting: SettingsTypes.STONE_SHIELD_PRIORITY, default: "11" },
      { setting: SettingsTypes.FROST_SHARD_PRIORITY, default: "12" },
    ];

    const spellTemplate: Record<string, string> = {};
    for (const { setting, default: defaultValue } of spellSettings) {
      const currentValue = await getSetting(interaction.guild.id, setting);
      spellTemplate[setting] = currentValue || defaultValue;
    }

    const jsonTemplate = JSON.stringify(spellTemplate, null, 2);

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Current Spell Priority Configuration',
          `Current values (copy and modify, then use \`/server bulk-update\`):\n\n\`\`\`json\n${jsonTemplate}\`\`\`\n\n*Lower numbers = higher priority*`,
        ),
      ],
      ephemeral: true,
    });
  }
}

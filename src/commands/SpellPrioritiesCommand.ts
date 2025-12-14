import { Command } from './Command';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SharedSlashCommand,
  TextChannel,
  Client,
} from 'discord.js';
import { getEmbedMessage } from '../utils/embeds';
import { getSetting } from '../database/settingsDatabase';
import { SettingsTypes } from '../SettingsTypes';

export class SpellPrioritiesCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('spell-priorities')
      .setDescription('View current spell priorities for clan war');
  }

  async execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'Cannot execute command outside a Guild',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;

    const spells = [
      {
        name: 'Phoenix Revival',
        setting: SettingsTypes.PHOENIX_REVIVAL_PRIORITY,
        defaultPriority: 1,
        type: 'Heal',
        tier: 4,
      },
      {
        name: 'Life Surge',
        setting: SettingsTypes.LIFE_SURGE_PRIORITY,
        defaultPriority: 4,
        type: 'Heal',
        tier: 3,
      },
      {
        name: 'Regeneration',
        setting: SettingsTypes.REGENERATION_PRIORITY,
        defaultPriority: 7,
        type: 'Heal',
        tier: 2,
      },
      {
        name: 'Healing Light',
        setting: SettingsTypes.HEALING_LIGHT_PRIORITY,
        defaultPriority: 10,
        type: 'Heal',
        tier: 1,
      },
      {
        name: 'Divine Aegis',
        setting: SettingsTypes.DIVINE_AEGIS_PRIORITY,
        defaultPriority: 2,
        type: 'Shield',
        tier: 4,
      },
      {
        name: 'Mirror Force',
        setting: SettingsTypes.MIRROR_FORCE_PRIORITY,
        defaultPriority: 5,
        type: 'Shield',
        tier: 3,
      },
      {
        name: 'Mystic Ward',
        setting: SettingsTypes.MYSTIC_WARD_PRIORITY,
        defaultPriority: 8,
        type: 'Shield',
        tier: 2,
      },
      {
        name: 'Stone Shield',
        setting: SettingsTypes.STONE_SHIELD_PRIORITY,
        defaultPriority: 11,
        type: 'Shield',
        tier: 1,
      },
      {
        name: 'Chaos Orb',
        setting: SettingsTypes.CHAOS_ORB_PRIORITY,
        defaultPriority: 3,
        type: 'Attack',
        tier: 4,
      },
      {
        name: 'Inferno Blast',
        setting: SettingsTypes.INFERNO_BLAST_PRIORITY,
        defaultPriority: 6,
        type: 'Attack',
        tier: 3,
      },
      {
        name: 'Lightning Strike',
        setting: SettingsTypes.LIGHTNING_STRIKE_PRIORITY,
        defaultPriority: 9,
        type: 'Attack',
        tier: 2,
      },
      {
        name: 'Frost Shard',
        setting: SettingsTypes.FROST_SHARD_PRIORITY,
        defaultPriority: 12,
        type: 'Attack',
        tier: 1,
      },
    ];

    const spellPriorities = await Promise.all(
      spells.map(async (spell) => {
        const priority =
          parseInt(
            (await getSetting(interaction.guild!.id, spell.setting)) ?? '',
          ) || spell.defaultPriority;
        return {
          name: spell.name,
          priority,
          type: spell.type,
          tier: spell.tier,
        };
      }),
    );

    spellPriorities.sort((a, b) => a.priority - b.priority);

    const description = spellPriorities
      .map((spell, index) => {
        const rank = index + 1;
        const maxStars = 4;
        const stars =
          '★'.repeat(spell.tier) +
          '☆'.repeat(maxStars - spell.tier);
        return `**${rank}.** ${spell.name} - ${spell.type} ${stars} (Priority: ${spell.priority})`;
      })
      .join('\n');

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          'Current Spell Priorities',
          `${description}\n\n*Lower priority numbers = higher preference*\n*Use \`/server settings\` to modify priorities*`,
        ),
      ],
      ephemeral: true,
    });
  }
}
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

export class SpellPriorityVerifyCommand implements Command {
  command: SharedSlashCommand;

  constructor() {
    this.command = new SlashCommandBuilder()
      .setName('spell-priority-verify')
      .setDescription('Verify that spell priorities are configured correctly within each group');
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

    const spellGroups = {
      Attack: [
        { name: 'Frost Shard', setting: SettingsTypes.FROST_SHARD_PRIORITY },
        { name: 'Lightning Strike', setting: SettingsTypes.LIGHTNING_STRIKE_PRIORITY },
        { name: 'Inferno Blast', setting: SettingsTypes.INFERNO_BLAST_PRIORITY },
        { name: 'Chaos Orb', setting: SettingsTypes.CHAOS_ORB_PRIORITY },
      ],
      Defense: [
        { name: 'Stone Shield', setting: SettingsTypes.STONE_SHIELD_PRIORITY },
        { name: 'Mystic Ward', setting: SettingsTypes.MYSTIC_WARD_PRIORITY },
        { name: 'Mirror Force', setting: SettingsTypes.MIRROR_FORCE_PRIORITY },
        { name: 'Divine Aegis', setting: SettingsTypes.DIVINE_AEGIS_PRIORITY },
      ],
      Heal: [
        { name: 'Healing Light', setting: SettingsTypes.HEALING_LIGHT_PRIORITY },
        { name: 'Regeneration', setting: SettingsTypes.REGENERATION_PRIORITY },
        { name: 'Life Surge', setting: SettingsTypes.LIFE_SURGE_PRIORITY },
        { name: 'Phoenix Revival', setting: SettingsTypes.PHOENIX_REVIVAL_PRIORITY },
      ],
    };

    const issues: string[] = [];
    const groupResults: string[] = [];

    for (const [groupName, spells] of Object.entries(spellGroups)) {
      const spellPriorities = await Promise.all(
        spells.map(async (spell) => {
          const priority = parseInt(
            (await getSetting(interaction.guild!.id, spell.setting)) ?? ''
          ) || 999;
          return {
            name: spell.name,
            priority,
            setting: spell.setting,
          };
        })
      );

      const groupIssues: string[] = [];
      
      for (let i = 0; i < spellPriorities.length - 1; i++) {
        const current = spellPriorities[i];
        const next = spellPriorities[i + 1];
        
        if (current.priority > next.priority) {
          groupIssues.push(
            `${current.name} (${current.priority}) should have higher priority than ${next.name} (${next.priority})`
          );
        }
      }

      if (groupIssues.length > 0) {
        issues.push(`**${groupName} Group Issues:**\n${groupIssues.map(issue => `• ${issue}`).join('\n')}`);
      } else {
        groupResults.push(`✅ **${groupName}** - Correctly configured`);
      }
    }

    let description: string;
    if (issues.length === 0) {
      description = `${groupResults.join('\n')}\n\n🎉 All spell priorities are correctly configured!`;
    } else {
      description = `${groupResults.join('\n')}\n\n${issues.join('\n\n')}\n\n*Use \`/server spell-template\` to get current config and \`/server bulk-update\` to fix issues*`;
    }

    const title = issues.length === 0 ? 'Spell Priority Verification - All Good!' : 'Spell Priority Verification - Issues Found';

    await interaction.reply({
      embeds: [
        getEmbedMessage(
          channel,
          title,
          description,
        ),
      ],
      ephemeral: true,
    });
  }
}
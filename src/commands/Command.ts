import { SharedSlashCommand, ChatInputCommandInteraction } from 'discord.js';

export interface Command {
  command: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

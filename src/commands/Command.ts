import {
  SharedSlashCommand,
  ChatInputCommandInteraction,
  Client,
} from 'discord.js';

export interface Command {
  command: SharedSlashCommand;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<void>;
}

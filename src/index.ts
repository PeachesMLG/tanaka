import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import websocket from './websocket';
import * as dotenv from 'dotenv';
import { getRecentSpawns, initialiseDatabase } from './database';
import { Card } from './types/websocketMessage';
import { startLeaderBoard } from './leaderboard';
import { RecentCommand } from './commands/RecentCommand';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [new RecentCommand()];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  await client.application?.commands.set(
    commands.map((value) => value.command),
  );

  await initialiseDatabase();
  await startLeaderBoard(client);
  websocket();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  try {
    for (const command of commands) {
      if (interaction.commandName === command.command.name) {
        await command.execute(interaction as ChatInputCommandInteraction);
        return;
      }
    }
  } catch (error) {
    await interaction.reply({ content: 'Internal Server Error...' });
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

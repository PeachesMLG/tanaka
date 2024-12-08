import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import websocket from './websocket';
import * as dotenv from 'dotenv';
import { initialiseDatabase } from './database';
import { startLeaderBoard } from './leaderboard';
import { RecentCommand } from './commands/RecentCommand';
import { TimerCommand } from './commands/TimerCommand';
import { startAllTimers } from './timers';
import { messageListeners, recentMessages } from './messageListener';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

const commands = [new RecentCommand(), new TimerCommand(client)];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  await client.application?.commands.set(
    commands.map((value) => value.command),
  );

  await initialiseDatabase();
  await startLeaderBoard(client);
  await startAllTimers(client);
  websocket(client);
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

client.on('messageCreate', (message) => {
  recentMessages.add(message);
  for (const [key, listener] of messageListeners.entries()) {
    if (listener.predicate(message)) {
      listener.resolve(message);
      if (listener.timeout) {
        clearTimeout(listener.timeout);
      }
      messageListeners.delete(key);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

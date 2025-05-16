import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as dotenv from 'dotenv';
import { initialiseDatabase } from './database/database';
import { TimerCommand } from './commands/TimerCommand';
import { startAllTimers } from './timers';
import { CardClaim } from './types/cardClaim';
import { mapEmojiToTier } from './utils/emojis';
import { cardClaimHandler } from './handlers/cardClaimHandler';
import { CardSpawn } from './types/cardSpawn';
import { getUserByMessageReference } from './utils/messageUtils';
import { cardSpawnHandler } from './handlers/cardSpawnHandler';
import { RecentCommand } from './commands/RecentCommand';
import { handleMessage } from './messageHandler';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

const commands = [new TimerCommand(client), new RecentCommand()];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  await client.application?.commands.set(
    commands.map((value) => value.command),
  );

  await initialiseDatabase();
  await startAllTimers(client);
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
    console.error(`Error Executing Command: `, error);
    await interaction.reply({ content: 'Internal Server Error...' });
  }
});

client.on('messageCreate', async (message) => {
  await handleMessage(message, client);
});

client.on('messageUpdate', async (_, newMessage) => {
  await handleMessage(newMessage, client);
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

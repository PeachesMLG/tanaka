import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as dotenv from 'dotenv';
import { initialiseDatabase } from './database/database';
import { TimerCommand } from './commands/TimerCommand';
import { startAllTimers } from './timers';
import { RecentCommand } from './commands/RecentCommand';
import { handleMessage } from './messageHandler';
import { UserSettingsCommand } from './commands/UserSettingsCommand';
import { ServerSettingsCommand } from './commands/ServerSettingsCommand';
import { messageListeners, recentMessages } from './utils/messageListener';
import { TopClaimersCommand } from './commands/TopClaimersCommand';
import { AuctionCommand } from './commands/AuctionCommand';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

const commands = [
  new TimerCommand(client),
  new RecentCommand(),
  new UserSettingsCommand(),
  new ServerSettingsCommand(),
  new TopClaimersCommand(),
  new AuctionCommand(),
];

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

client.on('messageUpdate', async (_, newMessage) => {
  await handleMessage(newMessage, client);
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

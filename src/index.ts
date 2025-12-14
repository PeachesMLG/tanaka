import {
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
} from 'discord.js';
import * as dotenv from 'dotenv';
import { initialiseDatabase } from './database/database';
import { TimerCommand } from './commands/TimerCommand';
import { TimersCommand } from './commands/TimersCommand';
import { startAllTimers } from './timers';
import { RecentCommand } from './commands/RecentCommand';
import { handleMessage } from './messageHandler';
import { UserSettingsCommand } from './commands/UserSettingsCommand';
import { ServerSettingsCommand } from './commands/ServerSettingsCommand';
import { messageListeners, recentMessages } from './utils/messageListener';
import { TopCommand } from './commands/TopCommand';
import { SpellPrioritiesCommand } from './commands/SpellPrioritiesCommand';
import { SpellPriorityVerifyCommand } from './commands/SpellPriorityVerifyCommand';
import { handleConnection } from './handleConnection';

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
  new TimersCommand(),
  new RecentCommand(),
  new UserSettingsCommand(),
  new ServerSettingsCommand(),
  new TopCommand(),
  new SpellPrioritiesCommand(),
  new SpellPriorityVerifyCommand(),
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  await client.application?.commands.set(
    commands.map((value) => value.command),
  );

  await startAllTimers(client);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  try {
    for (const command of commands) {
      if (interaction.commandName === command.command.name) {
        await command.execute(
          interaction as ChatInputCommandInteraction,
          client,
        );
        return;
      }
    }
  } catch (error) {
    console.error(`Error Executing Command: `, error);
    await interaction.reply({ content: 'Internal Server Error...' });
  }
});

client.on('messageCreate', async (message) => {
  try {
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
  } catch (exception) {
    console.error(exception);
  }
});

client.on('messageUpdate', async (_, newMessage) => {
  try {
    await handleMessage(newMessage, client);
  } catch (exception) {
    console.error(exception);
  }
});

handleConnection(client);

initialiseDatabase()
  .then(async () => {
    await client.login(process.env.DISCORD_TOKEN).catch((error) => {
      console.error('Error logging in:', error);
    });
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

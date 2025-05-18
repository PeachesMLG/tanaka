import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
import {
  activateAllAuctions,
  approveAuction,
  createAuction,
  rejectAuction,
  startNextAuctions,
} from './auctions';
import { getAuctionsByState } from './database/auctionDatabase';
import { AuctionStatus } from './types/auction';
import { editState, getAuction } from './utils/auctionEditor';

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
  await activateAllAuctions(client);

  const auctionsInQueue = await getAuctionsByState(AuctionStatus.IN_QUEUE);
  await Promise.all(
    Array.from(
      new Set(auctionsInQueue.map((a) => `${a.ServerId}|${a.Rarity}`)),
    ).map((key) => {
      const [ServerId, Rarity] = key.split('|');
      return startNextAuctions(ServerId, Rarity, client);
    }),
  );
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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [section, action, itemId] = interaction.customId.split('_');

  const start = Date.now();

  if (section === 'auction') {
    if (action === 'approve') {
      await approveAuction(itemId, interaction.guild!.id, client);
      await interaction.message.delete();
    } else if (action === 'reject') {
      await rejectAuction(itemId);
      await interaction.message.delete();
    } else if (action === 'edit') {
      const auction = getAuction(itemId);
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`auction_modal_edit_${itemId}`)
          .setTitle('Edit Auction Card')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Card Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(auction?.auction?.Name ?? ''),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('rarity')
                .setLabel('Card Rarity')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(auction?.auction?.Rarity ?? ''),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('version')
                .setLabel('Card Version')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(auction?.auction?.Version ?? ''),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('image')
                .setLabel('Card Image Url')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(auction?.auction?.ImageUrl ?? ''),
            ),
          ),
      );
    } else if (action === 'submit') {
      const auction = getAuction(itemId);
      if (!auction) {
        await interaction.reply({
          content: 'Auction no longer valid, please start again',
          ephemeral: true,
        });
        return;
      }
      const result = await createAuction(auction.auction, client);

      await interaction.reply({
        content: result,
        ephemeral: true,
      });
    }
  }

  const duration = Date.now() - start;
  console.log(
    `[Interaction Timing] Subcommand "${interaction.customId}" took ${duration}ms`,
  );
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isModalSubmit()) return;
  const [prefix, , field, guid] = interaction.customId.split('_');
  if (prefix !== 'auction' || !guid || field !== 'edit') return;

  const state = getAuction(guid);
  if (!state) return;

  const name = interaction.fields.getTextInputValue('name');
  const rarity = interaction.fields.getTextInputValue('rarity');
  const version = interaction.fields.getTextInputValue('version');
  const image = interaction.fields.getTextInputValue('image');

  await editState(guid, {
    Name: name,
    Rarity: rarity,
    Version: version,
    ImageUrl: image,
  });

  await interaction.deferUpdate();
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

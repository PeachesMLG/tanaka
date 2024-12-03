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

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  const commands = [
    new SlashCommandBuilder()
      .setName('recent')
      .setDescription('See Recent Spawns')
      .addStringOption((option) =>
        option
          .setName('tier')
          .setDescription('The tier of the card')
          .setRequired(false),
      ),
  ];

  await client.application?.commands.set(commands);

  await initialiseDatabase();
  websocket();
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('Error logging in:', error);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'recent') {
    if (!interaction.channel) {
      await interaction.reply({
        content: 'Cannot execute command outside a channel',
      });
      return;
    }
    const tier = (interaction as ChatInputCommandInteraction).options.getString(
      'tier',
    );

    const recentSpawns = await getRecentSpawns(
      interaction.channel?.id ?? '',
      tier ?? undefined,
    );

    const embed = new EmbedBuilder()
      .setTitle('Recent Claims')
      .setColor(0x0099ff);

    if (recentSpawns.length > 0) {
      const fields = await Promise.all(
        recentSpawns.map(async (claim) => {
          const discordTimestamp = `<t:${Math.floor(claim.dateTime.getTime() / 1000)}:R>`;

          const user = await interaction.client.users.fetch(claim.userClaimed);
          const userName = user.username;

          if (claim.status === 'claimed') {
            return `${claim.claimedCard.tier} • **${discordTimestamp}** • #${claim.claimedVersion} • **${claim.claimedCard.name}** • ${userName}`;
          } else if (claim.status === 'active') {
            return `**${discordTimestamp}** Pending`;
          } else {
            return `**${discordTimestamp}** Despawned :c`;
          }
        }),
      );

      embed.setDescription(fields.join('\n'));
    } else {
      embed.setDescription('No recent claims found.');
    }

    await interaction.reply({ embeds: [embed] });
  }
});

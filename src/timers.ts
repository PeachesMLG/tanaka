import { Client, CommandInteraction, TextChannel, User } from 'discord.js';
import { deleteTimer, saveTimer } from './database';
import { getEmbedMessage } from './utils/embeds';

export async function createTimer(
  channel: TextChannel,
  interaction: CommandInteraction | undefined,
  timestamp: number,
  user: User,
  reason: string,
  client: Client,
  information?: string,
) {
  const embed = constructTimerCreatedEmbed(
    channel,
    timestamp,
    user,
    reason,
    information,
  );
  if (interaction) {
    await interaction.reply({
      embeds: [embed],
    });
  } else {
    await channel.send({
      embeds: [embed],
    });
  }

  const id = await saveTimer(user.id, channel.id, reason, timestamp);

  activateTimer(channel.id, timestamp, user.id, reason, id, client);
}

export function activateTimer(
  channelId: string,
  timestamp: number,
  userId: string,
  reason: string,
  timerId: number,
  client: Client,
) {
  const milliseconds = timestamp * 1000 - Date.now();

  setTimeout(async () => {
    await deleteTimer(timerId);
    const channel = await client.channels.fetch(channelId);
    if (channel === null || !channel.isTextBased) return;
    const textChannel = channel as TextChannel;
    if (reason) {
      await textChannel.send(`Reminder for <@${userId}>: ${reason}`);
    } else {
      await textChannel.send(`Reminder for <@${userId}>!`);
    }
  }, milliseconds);
}

function constructTimerCreatedEmbed(
  channel: TextChannel,
  timestamp: number,
  user: User,
  reason?: string,
  information?: string | undefined,
) {
  let content = `Set a timer for <@${user.id}>.`;
  if (reason) {
    content += ' \n Reason: ${reason}';
  }
  content += ` \n It will go off at <t:${timestamp}:F>`;
  if (information) {
    content += ` \n -# ${information}`;
  }
  return getEmbedMessage(channel, 'Timer', content);
}

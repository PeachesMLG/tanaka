import { Client, CommandInteraction, TextChannel, User } from 'discord.js';
import { deleteTimer, getTimers, saveTimer } from './database';
import { getEmbedMessage } from './utils/embeds';

export async function createTimer(
  channel: TextChannel,
  interaction: CommandInteraction | undefined,
  timestamp: number,
  userId: string,
  reason: string,
  client: Client,
  information?: string,
) {
  const embed = constructTimerCreatedEmbed(
    channel,
    timestamp,
    userId,
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

  const id = await saveTimer(userId, channel.id, reason, timestamp);

  activateTimer(channel.id, timestamp, userId, reason, id, client);
}

export async function startAllTimers(client: Client) {
  const timers = await getTimers();
  timers.forEach((timer) => {
    activateTimer(
      timer.ChannelId,
      timer.Time,
      timer.UserId,
      timer.Reason,
      timer.Id,
      client,
    );
  });
}

export function activateTimer(
  channelId: string,
  timestamp: number,
  userId: string,
  reason: string,
  timerId: number,
  client: Client,
) {
  console.log(
    `Activating Timer ${timerId}, it will go off at ${timestamp} for ${reason}`,
  );
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
  userId: string,
  reason?: string,
  information?: string | undefined,
) {
  let content = `Set a timer for <@${userId}>.`;
  if (reason) {
    content += ` \n Reason: ${reason}`;
  }
  content += ` \n It will go off at <t:${timestamp}:F>`;
  if (information) {
    content += ` \n ${information}`;
  }
  return getEmbedMessage(channel, 'Timer', content);
}

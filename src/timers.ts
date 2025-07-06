import { Client, CommandInteraction, TextChannel } from 'discord.js';
import { deleteTimer, getTimers, saveTimer } from './database/timerDatabase';
import { getEmbedMessage } from './utils/embeds';
import { getChannel } from './utils/getChannel';
import { executeAtDate } from './utils/timerUtils';

export async function createTimer(
  channel: TextChannel,
  interaction: CommandInteraction | undefined,
  timestamp: Date,
  userId: string,
  reason: string,
  client: Client,
  information?: string,
) {
  const embed = constructTimerCreatedEmbed(channel, timestamp, userId, reason);
  if (!information) {
    if (interaction) {
      await interaction.reply({
        embeds: [embed],
      });
    } else {
      await channel.send({
        embeds: [embed],
      });
    }
  }

  const id = await saveTimer(
    userId,
    channel.id,
    reason,
    timestamp,
    information ?? '',
  );

  activateTimer(
    channel.id,
    timestamp,
    userId,
    reason,
    id,
    information ?? '',
    client,
  );
}

export async function startAllTimers(client: Client) {
  const timers = await getTimers();
  timers.forEach((timer) => {
    activateTimer(
      timer.ChannelID,
      timer.Time,
      timer.UserID,
      timer.Reason,
      timer.ID,
      timer.Information,
      client,
    );
  });
}

export function activateTimer(
  channelId: string,
  timestamp: Date,
  userId: string,
  reason: string,
  timerId: number,
  information: string,
  client: Client,
) {
  executeAtDate(timestamp, async () => {
    await deleteTimer(timerId);
    const channel = await getChannel(channelId, client);
    if (channel === null) return;
    await channel.send(constructTimerElapsed(userId, reason, information));
  });
}

function constructTimerCreatedEmbed(
  channel: TextChannel,
  futureTime: Date,
  userId: string,
  reason?: string,
) {
  let unixTimestamp = Math.floor(futureTime.getTime() / 1000);
  let content = `Set a timer for <@${userId}>.`;
  if (reason) {
    content += ` \n Reason: ${reason}`;
  }
  content += ` \n It will go off at <t:${unixTimestamp}:F>`;
  return getEmbedMessage(channel, 'Timer', content);
}

function constructTimerElapsed(
  userId: string,
  reason?: string,
  information?: string,
) {
  let content = `Reminder for <@${userId}>!`;
  if (reason) {
    content += `\nReason: ${reason.replace(/@/g, '@\u200b')}`;
  }
  if (information) {
    content += `\n-# ${information.replace('\n', '\n-# ')}`;
  }
  return content;
}

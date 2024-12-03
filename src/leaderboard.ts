import { Client, TextChannel } from 'discord.js';
import { getSpawnLeaderboard } from './database';
import { getEmbedMessage } from './utils';

async function updateLeaderBoard(client: Client, channelId: string) {
  try {
    let channel = await client.channels.fetch(channelId);
    if (channel === null) {
      return;
    }
    const textChannel = channel as TextChannel;
    const me = textChannel.guild.members.me;
    if (me === null) {
      return;
    }
    const messages = Array.from(
      (await textChannel.messages.fetch()).values(),
    ).filter((message) => message.author.id === me.id);

    const message = messages[0];
    const leaderBoard = await getSpawnLeaderboard(channelId);

    console.log(leaderBoard);

    let description = leaderBoard
      .map(
        (value, index) =>
          index + 1 + '. <@' + value.userId + '> - ' + value.count,
      )
      .join('\n');
    if (!description) {
      description = 'N/A';
    }

    if (message) {
      await message.edit({
        embeds: [getEmbedMessage(textChannel, 'Leaderboard', description)],
      });
    } else {
      await textChannel.send({
        embeds: [getEmbedMessage(textChannel, 'Leaderboard', description)],
      });
    }

    for (let i = 1; i < messages.length; i++) {
      try {
        await messages[i].delete();
      } catch (e) {
        console.error(e);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export async function startLeaderBoard(client: Client) {
  await updateLeaderBoard(client, '1272717571140882572');
  setTimeout(() => startLeaderBoard(client), 10000);
}

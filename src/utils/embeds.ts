import { Colors, EmbedBuilder, TextChannel } from 'discord.js';

export function getEmbedMessage(
  channel: TextChannel,
  title: string,
  description: string,
) {
  return new EmbedBuilder()
    .setColor(channel.guild.members.me?.displayHexColor ?? Colors.Blue)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'Coded by Peaches_MLG' });
}

export function sendEmbedMessage(
  channel: TextChannel,
  title: string,
  description: string,
  autoDelete: number,
) {
  channel
    .send({ embeds: [getEmbedMessage(channel, title, description)] })
    .then((msg) => {
      if (autoDelete <= 0) return;
      setTimeout(async () => {
        try {
          await msg.delete();
        } catch (e) {
          console.error(e);
        }
      }, autoDelete);
    });
}

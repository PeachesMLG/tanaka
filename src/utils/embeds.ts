import { Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';

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

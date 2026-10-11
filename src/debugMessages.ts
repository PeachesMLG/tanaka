import { Client, TextChannel } from 'discord.js';

const DEBUG_GUILD_ID = '1222204521296691260';
const DEBUG_CHANNEL_ID = '1556610633770729504';

export const logRecentMessages = async (client: Client, limit = 10) => {
  try {
    const guild = await client.guilds.fetch(DEBUG_GUILD_ID);
    const channel = (await guild.channels.fetch(
      DEBUG_CHANNEL_ID,
    )) as TextChannel | null;
    if (!channel) {
      console.log('[debug] Channel not found');
      return;
    }

    const messages = await channel.messages.fetch({ limit });
    for (const message of [...messages.values()].reverse()) {
      const data = {
        id: message.id,
        createdAt: message.createdAt.toISOString(),
        author: { id: message.author.id, username: message.author.username },
        flags: message.flags.toArray(),
        content: message.content,
        reference: message.reference,
        interactionMetadata: message.interactionMetadata
          ? {
              type: message.interactionMetadata.type,
              userId: message.interactionMetadata.user.id,
            }
          : null,
        embeds: message.embeds.map((embed) => embed.toJSON()),
        components: message.components.map((component) => component.toJSON()),
      };
      console.log(
        JSON.stringify(
          data,
          (_, value) => (typeof value === 'bigint' ? value.toString() : value),
          2,
        ),
      );
    }
  } catch (error) {
    console.error('[debug] Failed to fetch messages:', error);
  }
};

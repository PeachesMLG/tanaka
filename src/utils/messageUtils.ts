import {
  MessageInteractionMetadata,
  MessageReference,
  TextBasedChannel,
} from 'discord.js';

export const getUserByMessageReference = async (
  reference: MessageReference | null,
  interaction: MessageInteractionMetadata | null,
  channel: TextBasedChannel,
) => {
  if (reference?.messageId) {
    const repliedTo = await channel.messages.fetch(reference.messageId);
    if (repliedTo) {
      return repliedTo.author.id;
    }
  }
  if (interaction?.user.id) {
    return interaction.user.id;
  }
  return undefined;
};

import { CardDespawn } from '../types/websocketMessage';
import { saveCardDespawn } from '../database';
import { Client } from 'discord.js';

export const cardDespawnHandler = async (
  cardDespawn: CardDespawn,
  client: Client,
) => {
  await saveCardDespawn(cardDespawn);
};

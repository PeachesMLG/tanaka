import { CardDespawn } from '../types/websocketMessage';
import { saveCardDespawn } from '../database';

export const cardDespawnHandler = async (cardDespawn: CardDespawn) => {
  await saveCardDespawn(cardDespawn);
};

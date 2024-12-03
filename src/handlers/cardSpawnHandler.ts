import { CardSpawn } from '../types/websocketMessage';
import { saveCardSpawn } from '../database';

export const cardSpawnHandler = async (cardSpawn: CardSpawn) => {
  await saveCardSpawn(cardSpawn);
};

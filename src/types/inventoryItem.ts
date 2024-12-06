import { Card } from './websocketMessage';

export type InventoryItem = {
  id: string;
  type: string;
  typeId: string;
  card: Card;
  version: number;
  owner: string;
  obtainedDate: string;
  equippedFrame: string;
  isLocked: boolean;
};

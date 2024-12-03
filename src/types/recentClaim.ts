import { Card } from './websocketMessage';

export type RecentClaim = {
  serverId: string;
  channelId: string;
  batchId: string;
  dateTime: Date;
  claimedCard: Card;
  claimedVersion: number;
  userClaimed: string;
  status: string;
  cards: string;
};

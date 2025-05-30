import { QueueType } from './queueType';

export type Auction = {
  ID: number;
  ServerId: string;
  UserId: string;
  CardId: string;
  Version: string;
  Rarity: string;
  Series: string;
  Name: string;
  ChannelId: string;
  ThreadId: string;
  QueueMessageId: string;
  PositionInQueue: number;
  Status: AuctionStatus;
  QueueType: QueueType;
  ImageUrl: string;
  CurrencyPreferences: string;
  CreatedDateTime: Date;
  ExpiresDateTime: Date;
};

export enum AuctionStatus {
  PENDING = 'PENDING',
  IN_QUEUE = 'IN_QUEUE',
  IN_AUCTION = 'IN_AUCTION',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
}

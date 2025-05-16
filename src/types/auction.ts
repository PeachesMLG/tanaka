export type Auction = {
  ID: number;
  ServerId: string;
  UserId: string;
  CardId: string;
  Version: string;
  Status: AuctionStatus;
  DateTime: Date;
};

export enum AuctionStatus {
  PENDING = 'PENDING',
  IN_QUEUE = 'IN_QUEUE',
  IN_AUCTION = 'IN_AUCTION',
  DONE = 'DONE',
}

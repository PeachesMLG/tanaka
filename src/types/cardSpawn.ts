import { CardInfo } from './cardInfo';

export type CardSpawn = {
  SummonedBy?: string;
  ServerId: string;
  ChannelId: string;
  Cards: CardInfo[];
};

import { CardDetails } from './cardDetails';

export type CardSpawn = {
  SummonedBy?: string;
  ServerId: string;
  ChannelId: string;
  Cards: CardDetails[];
};

import { CardItem } from './cardItem';

export type CardClaim = {
  ServerId: string;
  UserID: string;
  CardItem: CardItem;
  DateTime: Date;
};

export type MazokuRarityUpper = 'C' | 'R' | 'SR' | 'SSR' | 'UR';

// https://api.mazoku.cc/cards/$uuid/versions?page=0&pageSize=15&orderBy=version&order=ASC
export interface MazokuVersionsApiResponse {
  versions: CardInstance[];
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface CardInstance {
  claimedAt: Date;
  isListed: boolean;
  inDeck: boolean;
  locked: boolean;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  ownerActiveAt: string;
  version: number;
}

export type BaseCardInfo = {
  rarity: string;
  name: string;
  series: string;
};

export type SpawnCard = BaseCardInfo & {
  uuid: string;
  uncollectedVersions: number[];
};

export interface MazokuCardAPIResponse {
  cards: MazokuAPICard[];
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface MazokuAPICard {
  id: string;
  tier: MazokuRarityUpper;
  name: string;
  seriesName: string;
  eventName: string;
  special: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

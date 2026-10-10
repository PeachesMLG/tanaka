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

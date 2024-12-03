export type Card = {
  approved: boolean;
  cardImageLink: string;
  id: string;
  linkToArtist: string[];
  makers: string[];
  messageLink: string;
  name: string;
  psdLink: string;
  renderLink: string;
  series: string;
  tier: string;
  type: string;
};

export type CardClaim = {
  batchId: string;
  card: Card;
  cardVersion: number;
  claimId: string;
  userId: string;
};

export type CardDespawn = {
  batchId: string;
};

export type CardSpawn = {
  batchId: string;
  channelId: string;
  claims: Claim[];
  id: string;
  serverId: string;
};

export type Claim = {
  card: Card;
  claimId: string;
};

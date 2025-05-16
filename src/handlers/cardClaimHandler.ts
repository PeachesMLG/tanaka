import { Client } from 'discord.js';
import { CardClaim } from '../types/cardClaim';
import { saveClaim } from '../database/recentClaimsDatabase';

export const cardClaimHandler = async (
  cardClaim: CardClaim,
  client: Client,
) => {
  await saveClaim(cardClaim);
};

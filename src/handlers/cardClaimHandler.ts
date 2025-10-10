import { Client } from 'discord.js';
import { CardClaim } from '../types/cardClaim';
import { saveClaim } from '../database/recentClaimsDatabase';
// import { refreshCardVersions } from '../utils/cardUtils';

export const cardClaimHandler = async (
  cardClaim: CardClaim,
  client: Client,
) => {
  await saveClaim(cardClaim);

  if (parseInt(cardClaim.CardItem.Version) <= 10) {
    // await refreshCardVersions(cardClaim.CardItem.Details.UUID);
  }
};

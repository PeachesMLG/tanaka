import { CardClaim } from '../types/websocketMessage';
import { saveCardClaim } from '../database';

export const cardClaimHandler = async (cardClaim: CardClaim) => {
  await saveCardClaim(cardClaim);
};

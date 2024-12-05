import { CardClaim } from '../types/websocketMessage';
import { saveCardClaim } from '../database';
import { Client } from 'discord.js';

export const cardClaimHandler = async (
  cardClaim: CardClaim,
  client: Client,
) => {
  await saveCardClaim(cardClaim);
};

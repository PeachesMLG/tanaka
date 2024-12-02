import {CardClaim} from "../types/websocketMessage";

export const cardClaimHandler = async (cardClaim: CardClaim) => {
    console.log(`Card Claimed! ${cardClaim.card.name} V${cardClaim.cardVersion}`);
}
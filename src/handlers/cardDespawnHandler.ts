import {CardDespawn} from "../types/websocketMessage";

export const cardDespawnHandler = async (cardDespawn: CardDespawn) => {
    console.log(`Card Despawned :c ${cardDespawn.batchId}`)
}
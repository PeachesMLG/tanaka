import {CardSpawn} from "../types/websocketMessage";

export const cardSpawnHandler = async (cardSpawn: CardSpawn) => {
    console.log(`Card spawned! ${cardSpawn.claims.map(value => value.card.name).join(', ')}`);
}
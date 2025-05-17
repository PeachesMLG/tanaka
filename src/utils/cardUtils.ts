import { CardDetails } from '../types/cardDetails';

export async function getCardDetails(
  cardId: string,
): Promise<CardDetails | undefined> {
  const detailsUrl = `https://server.mazoku.cc/card/catalog/${cardId}`;

  try {
    const res = await fetch(detailsUrl);

    const data = await res.json();

    if (!data.uuid) {
      return undefined;
    }

    return {
      imageUrl: `https://cdn3.mazoku.cc/a/750/card/${cardId}.webp`,
      cardName: data.name,
      seriesName: data.series?.name,
      rarity: data.rarity?.name,
      eventName: data.type?.name,
    } as CardDetails;
  } catch (err) {
    console.error(`Failed to fetch auction details: ${err}`);
    return undefined;
  }
}

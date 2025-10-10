import { getRedisKey, setRedisKey } from '../database/redisDatabase';
import { CardItem } from '../types/cardItem';
import { CardDetails } from '../types/cardDetails';

export async function getApiKey(): Promise<string | null> {
  const key = await getRedisKey('MAZOKU_API_KEY');
  if (!key) {
    console.error(`No API key found for ${key}`);
  }
  return key;
}

export async function getCardInfo(
  cardUUID: string,
): Promise<CardDetails | undefined> {
  const redisKey = `card_catalog_${cardUUID}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    return JSON.parse(cached) as CardDetails;
  }

  return undefined;

  // const url = `https://server.mazoku.cc/card/catalog/${cardUUID}`;
  //
  // try {
  //   console.log('Fetching Card Details...');
  //   const response = await fetch(url);
  //   if (!response.ok) {
  //     console.error(`Failed to fetch card: ${response.statusText}`);
  //     return undefined;
  //   }
  //
  //   const data = await response.json();
  //
  //   const cardInfo: CardDetails = {
  //     CardName: data.name,
  //     SeriesName: data.series.name,
  //     Rarity: data.rarity.name.toUpperCase(),
  //     UUID: data.uuid,
  //     EventName: data.type.name,
  //   };
  //
  //   await setRedisKey(redisKey, JSON.stringify(cardInfo));
  //
  //   return cardInfo;
  // } catch (err) {
  //   console.error('Error fetching card: ', cardUUID, err);
  //   return undefined;
  // }
}

// async function fetchCardVersions(
//   cardUUID: string,
// ): Promise<number[] | undefined> {
//   const apiKey = await getApiKey();
//
//   if (!apiKey) {
//     console.error('No Mazoku API key found.');
//     return undefined;
//   }
//
//   const url = `https://server.mazoku.cc/card/instance/versions?card_uuid=${encodeURIComponent(
//     cardUUID,
//   )}&size=10&owner=none&order=ASC&order_column=version`;
//
//   try {
//     const response = await fetch(url, {
//       headers: {
//         Authorization: `${apiKey}`,
//       },
//     });
//
//     if (!response.ok) {
//       console.error(`Failed to fetch card versions: ${response.statusText}`);
//       return undefined;
//     }
//
//     const data = await response.json();
//
//     const versions = Array.from({ length: 10 }, (_, i) => i + 1);
//
//     const returnedVersions: number[] = data.data.map(
//       (item: { version: number }) => item.version,
//     );
//
//     return versions.filter((v) => !returnedVersions.includes(v));
//   } catch (error) {
//     console.error('Error fetching card versions:', error);
//     return undefined;
//   }
// }

export async function getCardVersions(cardUUID: string): Promise<string[]> {
  const redisKey = `card_versions_${cardUUID}`;
  const lastFetchedKey = `card_versions_${cardUUID}_last_fetched`;
  const cardDetails = await getCardInfo(cardUUID);
  const cardRefreshTime =
    cardDetails?.EventName === 'default' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    const versions = cached.split(',').filter((value) => value);
    // const lastFetched = await getRedisKey(lastFetchedKey);
    // if (
    //   (lastFetched !== null &&
    //     new Date().getTime() - new Date(lastFetched).getTime() <
    //       cardRefreshTime) ||
    //   versions.length === 0
    // ) {
    return versions;
    // }
  }
  return ['N/A'];

  // const cardVersions = await fetchCardVersions(cardUUID);
  //
  // if (cardVersions !== undefined) {
  //   await setRedisKey(redisKey, cardVersions.join(','));
  //   await setRedisKey(lastFetchedKey, new Date().toISOString());
  //
  //   return cardVersions.map((value) => value.toString());
  // }
  //
  // // If the cache has expired but for whatever reason we cannot get latest card versions return the cache anywasy
  // if (cached !== null) {
  //   return cached.split(',').filter((value) => value);
  // }
  //
  // return [];
}

// export async function refreshCardVersions(cardUUID: string) {
//   const redisKey = `card_versions_${cardUUID}`;
//   const lastFetchedKey = `card_versions_${cardUUID}_last_fetched`;
//   const cardVersions = await fetchCardVersions(cardUUID);
//
//   if (cardVersions !== undefined) {
//     await setRedisKey(redisKey, cardVersions.join(','));
//     await setRedisKey(lastFetchedKey, new Date().toISOString());
//   }
// }

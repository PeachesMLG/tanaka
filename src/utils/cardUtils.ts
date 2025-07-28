import { getRedisKey, setRedisKey } from '../database/redisDatabase';
import { CardInfo } from '../types/cardInfo';

export async function getApiKey(): Promise<string | null> {
  const key = await getRedisKey('MAZOKU_API_KEY');
  if (!key) {
    console.error(`No API key found for ${key}`);
  }
  return key;
}

export async function getCardInfo(
  cardUUID: string,
): Promise<CardInfo | undefined> {
  const redisKey = `card_catalog_${cardUUID}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    return JSON.parse(cached) as CardInfo;
  }

  const url = `https://server.mazoku.cc/card/catalog/${cardUUID}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      return undefined;
    }

    const data = await response.json();

    const cardInfo: CardInfo = {
      Name: data.name,
      Series: data.series.name,
      Rarity: data.rarity.name.toUpperCase(),
      UUID: data.uuid,
      Version: '0',
    };

    await setRedisKey(redisKey, JSON.stringify(cardInfo));

    return cardInfo;
  } catch (err) {
    console.error('Error fetching card:', err);
    return undefined;
  }
}

async function fetchCardVersions(
  cardUUID: string,
): Promise<number[] | undefined> {
  const lastFetchedKey = `card_versions_${cardUUID}_last_fetched`;
  const apiKey = await getApiKey();

  if (!apiKey) {
    console.error('No Mazoku API key found.');
    return undefined;
  }

  const url = `https://server.mazoku.cc/card/instance/versions?card_uuid=${encodeURIComponent(
    cardUUID,
  )}&size=10&owner=none&order=ASC&order_column=version`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch card versions: ${response.statusText}`);
      return undefined;
    }

    const data = await response.json();

    const versions = Array.from({ length: 10 }, (_, i) => i + 1);

    const returnedVersions: number[] = data.data.map(
      (item: { version: number }) => item.version,
    );

    const singleVersions = versions.filter(
      (v) => !returnedVersions.includes(v),
    );

    await setRedisKey(lastFetchedKey, new Date().toISOString());

    return singleVersions;
  } catch (error) {
    console.error('Error fetching card versions:', error);
    return undefined;
  }
}

export async function getCardVersions(cardUUID: string): Promise<string[]> {
  const redisKey = `card_versions_${cardUUID}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    await handleCardVersionRefresh(cardUUID);
    return cached.split(',').filter((value) => value);
  }

  const cardVersions = await fetchCardVersions(cardUUID);

  if (cardVersions !== undefined) {
    await setRedisKey(redisKey, cardVersions.join(','));

    return cardVersions.map((value) => value.toString());
  }
  return [];
}

async function handleCardVersionRefresh(cardUUID: string) {
  const redisKey = `card_versions_${cardUUID}_last_fetched`;
  const lastFetched = await getRedisKey(redisKey);
  if (
    lastFetched === null ||
    new Date().getTime() - new Date(lastFetched).getTime() > 24 * 60 * 60 * 1000
  ) {
    fetchCardVersions(cardUUID).then((_) => {});
  }
}

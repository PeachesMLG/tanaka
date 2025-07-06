import {
  getRedisKey,
  incrementKey,
  setRedisKey,
} from '../database/redisDatabase';

export async function getApiKey(): Promise<string | null> {
  const key = await getRedisKey('MAZOKU_API_KEY');
  if (!key) {
    console.error(`No API key found for ${key}`);
  }
  return key;
}

export async function fetchCard(
  cardName: string,
  seriesName: string,
  cardTier: string,
): Promise<string | undefined> {
  await incrementKey('card_uuid_fetch_count');
  const encodedCardName = encodeURIComponent(cardName);
  const encodedSeriesName = encodeURIComponent(seriesName);
  const encodedCardTier = encodeURIComponent(cardTier);

  const url = `https://server.mazoku.cc/card/catalog?page=1&size=24&name=${encodedCardName}&series=${encodedSeriesName}&rarities=${encodedCardTier}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      return undefined;
    }

    const data = await response.json();

    if (data.cards && data.cards.length > 0) {
      const exactMatch = data.cards.find(
        (card: any) => card.name.toLowerCase() === cardName.toLowerCase(),
      );
      return exactMatch?.uuid;
    } else {
      return undefined;
    }
  } catch (err) {
    console.error('Error fetching card:', err);
    return undefined;
  }
}

export async function getCard(
  cardName: string,
  seriesName: string,
  cardTier: string,
): Promise<string | undefined> {
  const redisKey = `card_uuid_${cardName.replace(/\s+/g, '_')}_${seriesName.replace(/\s+/g, '_')}_${cardTier.replace(/\s+/g, '_')}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    await incrementKey('card_uuid_cached_count');
    return cached;
  }

  const cardUUID = await fetchCard(cardName, seriesName, cardTier);

  if (cardUUID) {
    await setRedisKey(redisKey, cardUUID);
    return cardUUID;
  }

  await setRedisKey(redisKey, '', 60 * 60 * 24);
  console.warn('Failed to retrieve redis key');
}

async function fetchCardVersions(
  cardUUID: string,
): Promise<number[] | undefined> {
  await incrementKey('card_version_fetch_count');
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

    return versions.filter((v) => !returnedVersions.includes(v));
  } catch (error) {
    console.error('Error fetching card versions:', error);
    return undefined;
  }
}

export async function getCardVersions(cardUUID: string): Promise<string[]> {
  const redisKey = `card_versions_${cardUUID}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    await incrementKey('card_version_cached_count');
    return cached.split(',');
  }

  const cardVersions = await fetchCardVersions(cardUUID);

  if (cardVersions !== undefined) {
    if (cardVersions.length === 0) {
      await setRedisKey(redisKey, cardVersions.join(','));
    } else {
      await setRedisKey(redisKey, cardVersions.join(','), 60 * 60 * 24);
    }
    return cardVersions.map((value) => value.toString());
  }
  return [];
}

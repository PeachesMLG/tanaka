import { getApiKey } from './cardUtils';
import { getRedisKey, setRedisKey } from '../database/redisDatabase';

async function fetchClanMembers(clanId: string): Promise<string[]> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    console.error('No Mazoku API key found.');
    return [];
  }

  const url = `https://server.mazoku.cc/clan/${clanId}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch card versions: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    return data.members.map((member: any) => {
      return member.discord_id;
    });
  } catch (error) {
    console.error('Error fetching card versions:', error);
    return [];
  }
}

export async function getClanMembers(clanId: string): Promise<string[]> {
  const redisKey = `clan_members_${clanId}`;
  const lastFetchedKey = `${redisKey}_last_fetched`;
  const cardRefreshTime = 24 * 60 * 60 * 1000;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    const userIds = cached.split(',').filter((value) => value);
    const lastFetched = await getRedisKey(lastFetchedKey);
    if (
      (lastFetched !== null &&
        new Date().getTime() - new Date(lastFetched).getTime() <
          cardRefreshTime) ||
      userIds.length === 0
    ) {
      return userIds;
    }
  }

  const userIds = await fetchClanMembers(clanId);

  if (userIds !== undefined) {
    await setRedisKey(redisKey, userIds.join(','));
    await setRedisKey(lastFetchedKey, new Date().toISOString());

    return userIds.map((value) => value.toString());
  }

  // If the cache has expired but for whatever reason we cannot get latest card versions return the cache anywasy
  if (cached !== null) {
    return cached.split(',').filter((value) => value);
  }

  return [];
}

import { getRedisKey, setRedisKey } from '../database/redisDatabase';
import { UserData } from '../types/userData';

const ONE_DAY_SECONDS = 24 * 60 * 60;

function getCacheTtl(user: UserData): number {
  const premiumExpiry = new Date(user.premiumExpiresAt).getTime();
  const now = Date.now();

  if (premiumExpiry > now) {
    const secondsUntilExpiry = Math.floor((premiumExpiry - now) / 1000);
    return Math.min(secondsUntilExpiry, ONE_DAY_SECONDS);
  }

  return ONE_DAY_SECONDS;
}

async function fetchUser(userId: string): Promise<UserData> {
  const response = await fetch(`https://api.mazoku.cc/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user ${userId}: ${response.statusText}`);
  }
  return await response.json();
}

export async function getUser(userId: string): Promise<UserData> {
  const redisKey = `user_${userId}`;
  const cached = await getRedisKey(redisKey);
  if (cached !== null) {
    return JSON.parse(cached) as UserData;
  }

  const user = await fetchUser(userId);
  await setRedisKey(redisKey, JSON.stringify(user), getCacheTtl(user));

  return user;
}

export async function isUserPremium(userId: string): Promise<boolean> {
  const user = await getUser(userId);

  const now = Date.now();
  const premiumExpiry = new Date(user.premiumExpiresAt).getTime();
  return premiumExpiry > now;
}

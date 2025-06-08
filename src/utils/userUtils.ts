import { TimedMap } from './timedMap';
import { UserData } from '../types/userData';

const cacheTimeout = 1000 * 60 * 60;
const cache = new TimedMap<UserData>();

async function fetchUser(userId: string): Promise<UserData> {
  const response = await fetch(`https://server.mazoku.cc/user/get/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user ${userId}: ${response.statusText}`);
  }
  return await response.json();
}

export async function getUser(userId: string): Promise<UserData> {
  let user = cache.get(userId);

  if (!user) {
    user = await fetchUser(userId);
    cache.update(userId, user, cacheTimeout);
  }

  return user;
}

export async function isUserPremium(userId: string): Promise<boolean> {
  let user = await getUser(userId);

  const now = Date.now();
  const premiumExpiry = new Date(user.premium).getTime();
  return premiumExpiry > now;
}

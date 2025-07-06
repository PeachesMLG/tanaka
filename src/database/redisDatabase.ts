import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

async function connect(): Promise<void> {
  if (!client) {
    client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });

    client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    await client.connect();
  } else if (!client.isOpen) {
    await client.connect();
  }
}

export async function getRedisKey(key: string): Promise<string | null> {
  await connect();
  try {
    return await client!.get(key);
  } catch (err) {
    console.error(`Error getting key "${key}":`, err);
    throw err;
  }
}

export async function setRedisKey(
  key: string,
  value: string,
  timeoutInSeconds?: number,
): Promise<void> {
  await connect();
  try {
    if (timeoutInSeconds && timeoutInSeconds > 0) {
      await client!.set(key, value, {
        EX: timeoutInSeconds,
      });
    } else {
      await client!.set(key, value);
    }
  } catch (err) {
    console.error(`Error setting key "${key}":`, err);
    throw err;
  }
}

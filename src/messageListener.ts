import { Message } from 'discord.js';
import { v4 as uuid } from 'uuid';
import { TimedMap } from './utils/timedMap';

export const messageListeners: Map<
  string,
  {
    predicate: (message: Message) => boolean;
    resolve: (message: Message | undefined) => void;
    timeout?: NodeJS.Timeout;
  }
> = new Map();

export const recentMessages = new TimedMap<Message>();

export async function waitForMessage(
  predicate: (message: Message) => boolean,
  timeoutMs: number = 5000,
): Promise<Message | undefined> {
  console.log(`Searching the past ${recentMessages.size()} Messages in Cache`);
  for (const [key, { value, expiry }] of recentMessages.entries()) {
    if (predicate(value)) {
      console.log(`Found message in cache.`);
      return value;
    }
  }

  return await new Promise((resolve) => {
    const id = uuid();

    const listener = {
      predicate,
      resolve,
      timeout: setTimeout(() => {
        messageListeners.delete(id);
        resolve(undefined);
      }, timeoutMs),
    };

    messageListeners.set(id, listener);
  });
}

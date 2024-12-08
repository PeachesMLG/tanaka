import { Message } from 'discord.js';
import { v4 as uuid } from 'uuid';

export const messageListeners: Map<
  string,
  {
    predicate: (message: Message) => boolean;
    resolve: (message: Message | undefined) => void;
    timeout?: NodeJS.Timeout;
  }
> = new Map();

export function waitForMessage(
  predicate: (message: Message) => boolean,
  timeoutMs: number = 5000,
): Promise<Message | undefined> {
  return new Promise((resolve) => {
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

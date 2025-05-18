import { v4 as uuid } from 'uuid';

export class TimedMap<V> {
  private map = new Map<string, { value: V; expiry: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 5000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  add(value: V, timeout: number = 1000): string {
    const key = uuid();
    const expiry = Date.now() + timeout;
    this.map.set(key, { value, expiry });
    return key;
  }

  update(key: string, value: V, timeout?: number) {
    const old = this.map.get(key);
    if (!old) return;
    this.map.set(key, {
      value: value,
      expiry: timeout ? Date.now() + timeout : old.expiry,
    });
  }

  get(key: string): V | undefined {
    return this.map.get(key)?.value;
  }

  keys(): MapIterator<string> {
    return this.map.keys();
  }

  size(): number {
    return this.map.size;
  }

  entries(): MapIterator<[string, { value: V; expiry: number }]> {
    return this.map.entries();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, { expiry }] of this.map) {
      if (expiry <= now) {
        this.map.delete(key);
      }
    }
  }
}

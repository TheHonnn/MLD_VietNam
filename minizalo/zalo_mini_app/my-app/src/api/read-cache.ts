type Entry<T> = { value?: T; pending?: Promise<T>; expiresAt: number };
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// JSON responses only. Invalidation removes the entry so a late request cannot restore it.
export class ReadCache<T> {
  private entries = new Map<string, Entry<T>>();
  constructor(private ttl = 60000, private capacity = 256, private accepts: (value: T) => boolean = () => true) {}

  peek(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry || entry.value === undefined || entry.expiresAt <= Date.now()) return null;
    return copy(entry.value);
  }

  read(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.peek(key);
    if (cached !== null) return Promise.resolve(cached);
    const pending = this.entries.get(key)?.pending;
    if (pending) return pending.then(copy);
    const entry: Entry<T> = { expiresAt: 0 };
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    entry.pending = Promise.resolve().then(load).then(value => {
      if (this.entries.get(key) === entry) {
        if (this.accepts(value)) { entry.value = copy(value); entry.expiresAt = Date.now() + this.ttl; entry.pending = undefined; }
        else this.entries.delete(key);
      }
      return value;
    }, error => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    });
    return entry.pending.then(copy);
  }

  invalidate(matches: (key: string) => boolean = () => true) {
    for (const key of this.entries.keys()) if (matches(key)) this.entries.delete(key);
  }
}

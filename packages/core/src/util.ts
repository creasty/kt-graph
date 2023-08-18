export function requireNotNull<T>(value: T, message?: string): NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message ?? "value is null");
  }
  return value;
}

export interface Identifiable {
  toId(): string;
}

export function withCache<T extends Identifiable, R>(fn: (item: T) => R) {
  const cache = new Map<string, R>();
  return (item: T): R => {
    const id = item.toId();
    const cachedResult = cache.get(id);
    if (cachedResult) return cachedResult;
    const result = fn(item);
    cache.set(id, result);
    return result;
  };
}

export function lcsScore(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  const m = Array.from({ length: al }, () => 0);
  let result = 0;

  for (let i = 0; i < bl; i++) {
    let d = (result = 0);
    for (let j = 0; j < al; j++) {
      const t = b[i] == a[j] ? d + 1 : d;
      d = m[j];
      m[j] = result = Math.max(d, t, result);
    }
  }

  return (result * 2.0) / (al + bl);
}

export class Table<K, V> extends Map<K, V> {
  constructor(
    iterable: Iterable<readonly [K, V]> | null,
    public initializeValue: (key: K) => V
  ) {
    super(iterable);
  }

  fetch(key: K): V {
    if (!this.has(key)) {
      this.set(key, this.initializeValue(key));
    }
    return this.get(key)!;
  }
}

class LRUCache {
  #cache = new Map();

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.#cache.has(key)) return null;
    const entry = this.#cache.get(key);
    if (Date.now() > entry.expiry) {
      this.#cache.delete(key);
      return null;
    }
    this.#cache.delete(key);
    this.#cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs) {
    if (this.#cache.has(key)) this.#cache.delete(key);
    if (this.#cache.size >= this.maxSize) {
      this.#cache.delete(this.#cache.keys().next().value);
    }
    this.#cache.set(key, { value, expiry: Date.now() + ttlMs });
    return this;
  }

  has(key) {
    if (!this.#cache.has(key)) return false;
    const entry = this.#cache.get(key);
    if (Date.now() > entry.expiry) {
      this.#cache.delete(key);
      return false;
    }
    return true;
  }

  invalidate(key) {
    this.#cache.delete(key);
    return this;
  }

  invalidatePattern(pattern) {
    for (const key of this.#cache.keys()) {
      if (key.includes(pattern)) this.#cache.delete(key);
    }
    return this;
  }

  clear() {
    this.#cache.clear();
    return this;
  }

  get size() {
    return this.#cache.size;
  }
}

export const CACHE = new LRUCache(50);

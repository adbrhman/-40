import { RATE_LIMITS } from './config.js';

class RateLimiter {
  #store = {};

  check(key) {
    const config = RATE_LIMITS[key];
    if (!config) return true;

    const now = Date.now();
    if (!this.#store[key]) this.#store[key] = [];

    this.#store[key] = this.#store[key].filter(ts => now - ts < config.windowMs);

    if (this.#store[key].length >= config.count) return false;
    this.#store[key].push(now);
    return true;
  }

  remaining(key) {
    const config = RATE_LIMITS[key];
    if (!config) return Infinity;
    const now = Date.now();
    const active = (this.#store[key] || []).filter(ts => now - ts < config.windowMs);
    return Math.max(0, config.count - active.length);
  }

  reset(key) {
    delete this.#store[key];
  }

  nextAllowedAt(key) {
    const config = RATE_LIMITS[key];
    if (!config || !this.#store[key]?.length) return Date.now();
    const oldest = Math.min(...this.#store[key]);
    return oldest + config.windowMs;
  }
}

export const rateLimiter = new RateLimiter();

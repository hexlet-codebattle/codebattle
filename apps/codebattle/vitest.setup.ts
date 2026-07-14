import '@testing-library/jest-dom/vitest';

class MemoryStorage implements Storage {
  #items = new Map<string, string>();

  get length() {
    return this.#items.size;
  }

  clear() {
    this.#items.clear();
  }

  getItem(key: string) {
    return this.#items.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.#items.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.#items.delete(key);
  }

  setItem(key: string, value: string) {
    this.#items.set(key, String(value));
  }
}

// Newer Node releases expose an incomplete localStorage global unless a backing
// file is configured. Give jsdom and application imports a deterministic store.
const localStorage = new MemoryStorage();
Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

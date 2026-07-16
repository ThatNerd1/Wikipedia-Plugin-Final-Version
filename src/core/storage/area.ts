/**
 * Dünne, promisebasierte Abstraktion über chrome.storage/browser.storage
 * mit In-Memory-Fallback für Tests. Zugriff nur aus Extension-Kontexten.
 */
export interface KeyValueArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

interface ChromeLikeStorageArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

interface ChromeLike {
  storage?: { local?: ChromeLikeStorageArea; sync?: ChromeLikeStorageArea; session?: ChromeLikeStorageArea };
}

function chromeApi(): ChromeLike | null {
  const g = globalThis as { chrome?: ChromeLike; browser?: ChromeLike };
  return g.browser?.storage ? g.browser : g.chrome?.storage ? g.chrome : null;
}

class MemoryArea implements KeyValueArea {
  private data = new Map<string, unknown>();
  async get(keys: string | string[]): Promise<Record<string, unknown>> {
    const list = Array.isArray(keys) ? keys : [keys];
    const out: Record<string, unknown> = {};
    for (const k of list) if (this.data.has(k)) out[k] = this.data.get(k);
    return out;
  }
  async set(items: Record<string, unknown>): Promise<void> {
    for (const [k, v] of Object.entries(items)) this.data.set(k, v);
  }
  async remove(keys: string | string[]): Promise<void> {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.data.delete(k);
  }
}

const memoryLocal = new MemoryArea();
const memorySession = new MemoryArea();

export function localArea(): KeyValueArea {
  return chromeApi()?.storage?.local ?? memoryLocal;
}

/** storage.session (nur Extension-Kontexte); Fallback auf Speicher im Prozess. */
export function sessionArea(): KeyValueArea {
  return chromeApi()?.storage?.session ?? memorySession;
}

/** Einstellungen optional synchronisiert; fällt sauber auf local zurück. */
export function settingsArea(): KeyValueArea {
  return chromeApi()?.storage?.sync ?? localArea();
}

export function generateId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

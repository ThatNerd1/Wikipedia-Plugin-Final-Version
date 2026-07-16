import { SavedArticle, BOOKMARK_LIMIT, coerceSavedArticle, listBookmarks } from './bookmarks.js';
import { localArea } from './area.js';

export const EXPORT_VERSION = 1;
export const MAX_IMPORT_BYTES = 1_000_000; // 1 MB

export interface ExportFile {
  format: 'wikipedia-quick-search-bookmarks';
  version: number;
  exportedAt: string;
  bookmarks: SavedArticle[];
}

export async function exportBookmarksJson(): Promise<string> {
  const bookmarks = await listBookmarks();
  const file: ExportFile = {
    format: 'wikipedia-quick-search-bookmarks',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    bookmarks
  };
  return JSON.stringify(file, null, 2);
}

export interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  error?: string;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** JSON.parse-Reviver gegen Prototype Pollution. */
function safeReviver(key: string, value: unknown): unknown {
  if (FORBIDDEN_KEYS.has(key)) return undefined;
  return value;
}

/**
 * Importiert Bookmarks aus einer JSON-Datei mit Schema- und Größenvalidierung.
 * Ungültige Einträge werden übersprungen; nichts wird als HTML/Code interpretiert.
 */
export async function importBookmarksJson(text: string): Promise<ImportResult> {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, imported: 0, skipped: 0, error: 'Leere Datei.' };
  }
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    return { ok: false, imported: 0, skipped: 0, error: 'Datei überschreitet das Größenlimit von 1 MB.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text, safeReviver);
  } catch {
    return { ok: false, imported: 0, skipped: 0, error: 'Ungültiges JSON.' };
  }
  if (
    typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
    (parsed as Record<string, unknown>).format !== 'wikipedia-quick-search-bookmarks' ||
    !Array.isArray((parsed as Record<string, unknown>).bookmarks)
  ) {
    return { ok: false, imported: 0, skipped: 0, error: 'Unbekanntes Dateiformat.' };
  }
  const rawList = (parsed as { bookmarks: unknown[] }).bookmarks;
  if (rawList.length > BOOKMARK_LIMIT) {
    return { ok: false, imported: 0, skipped: 0, error: `Mehr als ${BOOKMARK_LIMIT} Einträge.` };
  }
  const existing = await listBookmarks();
  const seen = new Set(existing.map((b) => b.canonicalUrl));
  const accepted: SavedArticle[] = [];
  let skipped = 0;
  for (const raw of rawList) {
    const candidate = coerceSavedArticle(raw);
    if (!candidate || seen.has(candidate.canonicalUrl)) {
      skipped++;
      continue;
    }
    seen.add(candidate.canonicalUrl);
    accepted.push(candidate);
  }
  const next = [...accepted, ...existing].slice(0, BOOKMARK_LIMIT);
  await localArea().set({ 'wqs.bookmarks': next });
  return { ok: true, imported: accepted.length, skipped };
}

/** „Alle lokalen Daten löschen“ – History, Bookmarks, Einstellungen, Session-Daten. */
export async function clearAllLocalData(): Promise<void> {
  await localArea().remove(['wqs.history', 'wqs.bookmarks', 'wqs.settings']);
}

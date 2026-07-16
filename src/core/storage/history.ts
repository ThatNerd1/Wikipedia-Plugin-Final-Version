import { LanguageCode, isSupportedLanguage } from '../security/languages.js';
import { generateId, localArea } from './area.js';
import { getSettings } from './settings.js';

export interface SearchHistoryEntry {
  id: string;
  query: string;
  resolvedTitle?: string;
  language: LanguageCode;
  canonicalUrl?: string;
  timestamp: number;
}

export const HISTORY_LIMIT = 100;
const KEY = 'wqs.history';

function coerceEntry(raw: unknown): SearchHistoryEntry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.query !== 'string' || typeof r.timestamp !== 'number') return null;
  if (!isSupportedLanguage(r.language)) return null;
  if (r.query.length === 0 || r.query.length > 400) return null;
  return {
    id: r.id,
    query: r.query,
    language: r.language,
    timestamp: r.timestamp,
    resolvedTitle: typeof r.resolvedTitle === 'string' ? r.resolvedTitle.slice(0, 500) : undefined,
    canonicalUrl: typeof r.canonicalUrl === 'string' ? r.canonicalUrl.slice(0, 2000) : undefined
  };
}

export async function listHistory(): Promise<SearchHistoryEntry[]> {
  const data = await localArea().get(KEY);
  const raw = data[KEY];
  if (!Array.isArray(raw)) return [];
  return raw.map(coerceEntry).filter((e): e is SearchHistoryEntry => e !== null);
}

/**
 * Fügt einen Suchvorgang hinzu. Respektiert die Datenschutzeinstellung
 * (historyEnabled), dedupliziert unmittelbar aufeinanderfolgende Suchen
 * und begrenzt die Liste auf HISTORY_LIMIT Einträge.
 */
export async function addHistoryEntry(
  input: Omit<SearchHistoryEntry, 'id' | 'timestamp'>,
  options: { incognito?: boolean } = {}
): Promise<SearchHistoryEntry | null> {
  if (options.incognito) return null; // Incognito: niemals speichern.
  const settings = await getSettings();
  if (!settings.historyEnabled) return null;

  const entries = await listHistory();
  const latest = entries[0];
  if (latest && latest.query === input.query && latest.language === input.language) {
    return null; // Unmittelbar aufeinanderfolgende identische Suche.
  }
  const entry: SearchHistoryEntry = {
    ...input,
    query: input.query.slice(0, 400),
    id: generateId(),
    timestamp: Date.now()
  };
  const next = [entry, ...entries].slice(0, HISTORY_LIMIT);
  await localArea().set({ [KEY]: next });
  return entry;
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const entries = await listHistory();
  await localArea().set({ [KEY]: entries.filter((e) => e.id !== id) });
}

export async function clearHistory(): Promise<void> {
  await localArea().remove(KEY);
}

import { LanguageCode, isSupportedLanguage } from '../security/languages.js';
import { isTrustedImageUrl, isValidWikipediaArticleUrl } from '../security/url.js';
import { generateId, localArea } from './area.js';

/**
 * Bookmark-System innerhalb der Erweiterung.
 * Bewusst KEINE Browser-Lesezeichenberechtigung.
 */
export interface SavedArticle {
  id: string;
  title: string;
  language: LanguageCode;
  canonicalUrl: string;
  description?: string;
  thumbnailUrl?: string;
  savedAt: number;
}

export const BOOKMARK_LIMIT = 500;
const KEY = 'wqs.bookmarks';

export function coerceSavedArticle(raw: unknown): SavedArticle | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string' || r.title.length === 0 || r.title.length > 500) return null;
  if (!isSupportedLanguage(r.language)) return null;
  if (!isValidWikipediaArticleUrl(r.canonicalUrl)) return null;
  const thumbnailUrl =
    typeof r.thumbnailUrl === 'string' && isTrustedImageUrl(r.thumbnailUrl) ? r.thumbnailUrl : undefined;
  return {
    id: typeof r.id === 'string' && r.id.length <= 100 ? r.id : generateId(),
    title: r.title,
    language: r.language,
    canonicalUrl: r.canonicalUrl as string,
    description: typeof r.description === 'string' ? r.description.slice(0, 1000) : undefined,
    thumbnailUrl,
    savedAt: typeof r.savedAt === 'number' && Number.isFinite(r.savedAt) ? r.savedAt : Date.now()
  };
}

export async function listBookmarks(): Promise<SavedArticle[]> {
  const data = await localArea().get(KEY);
  const raw = data[KEY];
  if (!Array.isArray(raw)) return [];
  return raw.map(coerceSavedArticle).filter((e): e is SavedArticle => e !== null);
}

export async function isBookmarked(canonicalUrl: string): Promise<boolean> {
  const list = await listBookmarks();
  return list.some((b) => b.canonicalUrl === canonicalUrl);
}

/** Speichert einen Artikel; Dubletten (gleiche kanonische URL) werden verhindert. */
export async function addBookmark(input: Omit<SavedArticle, 'id' | 'savedAt'>): Promise<SavedArticle | null> {
  const candidate = coerceSavedArticle({ ...input, id: generateId(), savedAt: Date.now() });
  if (!candidate) return null;
  const list = await listBookmarks();
  if (list.some((b) => b.canonicalUrl === candidate.canonicalUrl)) return null;
  const next = [candidate, ...list].slice(0, BOOKMARK_LIMIT);
  await localArea().set({ [KEY]: next });
  return candidate;
}

export async function removeBookmark(id: string): Promise<void> {
  const list = await listBookmarks();
  await localArea().set({ [KEY]: list.filter((b) => b.id !== id) });
}

export async function removeBookmarkByUrl(canonicalUrl: string): Promise<void> {
  const list = await listBookmarks();
  await localArea().set({ [KEY]: list.filter((b) => b.canonicalUrl !== canonicalUrl) });
}

export async function clearBookmarks(): Promise<void> {
  await localArea().remove(KEY);
}

export function filterBookmarks(list: SavedArticle[], query: string): SavedArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (b) => b.title.toLowerCase().includes(q) || (b.description ?? '').toLowerCase().includes(q)
  );
}

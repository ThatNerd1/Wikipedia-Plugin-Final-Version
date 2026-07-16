import { beforeEach, describe, expect, it } from 'vitest';
import { addHistoryEntry, clearHistory, listHistory, removeHistoryEntry, HISTORY_LIMIT } from '../../src/core/storage/history.js';
import { addBookmark, clearBookmarks, isBookmarked, listBookmarks, removeBookmark } from '../../src/core/storage/bookmarks.js';
import { getSettings, updateSettings } from '../../src/core/storage/settings.js';

// Der In-Memory-Fallback von storage/area.ts wird genutzt (kein chrome global).
beforeEach(async () => {
  await clearHistory();
  await clearBookmarks();
  await updateSettings({ historyEnabled: true });
});

describe('History', () => {
  it('fügt Einträge hinzu und listet sie neueste-zuerst', async () => {
    await addHistoryEntry({ query: 'Zelle', language: 'de' });
    await addHistoryEntry({ query: 'Atom', language: 'de' });
    const list = await listHistory();
    expect(list[0]?.query).toBe('Atom');
    expect(list).toHaveLength(2);
  });
  it('dedupliziert unmittelbar aufeinanderfolgende Suchen', async () => {
    await addHistoryEntry({ query: 'Zelle', language: 'de' });
    await addHistoryEntry({ query: 'Zelle', language: 'de' });
    expect(await listHistory()).toHaveLength(1);
  });
  it('respektiert die Deaktivierung', async () => {
    await updateSettings({ historyEnabled: false });
    await addHistoryEntry({ query: 'X', language: 'de' });
    expect(await listHistory()).toHaveLength(0);
  });
  it('speichert im Incognito-Kontext nichts', async () => {
    await addHistoryEntry({ query: 'Geheim', language: 'de' }, { incognito: true });
    expect(await listHistory()).toHaveLength(0);
  });
  it('begrenzt auf HISTORY_LIMIT', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      await addHistoryEntry({ query: `q${i}`, language: 'de' });
    }
    expect((await listHistory()).length).toBe(HISTORY_LIMIT);
  });
  it('löscht einzelne Einträge', async () => {
    const e = await addHistoryEntry({ query: 'Zelle', language: 'de' });
    await removeHistoryEntry(e!.id);
    expect(await listHistory()).toHaveLength(0);
  });
});

describe('Bookmarks', () => {
  const article = {
    title: 'Zelle (Biologie)', language: 'de' as const,
    canonicalUrl: 'https://de.wikipedia.org/wiki/Zelle_(Biologie)', description: 'Grundbaustein'
  };
  it('speichert und verhindert Dubletten', async () => {
    expect(await addBookmark(article)).not.toBeNull();
    expect(await addBookmark(article)).toBeNull();
    expect(await listBookmarks()).toHaveLength(1);
  });
  it('prüft isBookmarked und entfernt', async () => {
    const b = await addBookmark(article);
    expect(await isBookmarked(article.canonicalUrl)).toBe(true);
    await removeBookmark(b!.id);
    expect(await isBookmarked(article.canonicalUrl)).toBe(false);
  });
  it('lehnt Bookmarks mit ungültiger URL ab', async () => {
    expect(await addBookmark({ ...article, canonicalUrl: 'https://evil.com/wiki/x' })).toBeNull();
  });
});

describe('Settings', () => {
  it('liefert Defaults und persistiert Patches', async () => {
    const s = await getSettings();
    expect(s.language).toBe('de');
    await updateSettings({ language: 'en' });
    expect((await getSettings()).language).toBe('en');
    await updateSettings({ language: 'de' });
  });
  it('ignoriert ungültige Sprachcodes', async () => {
    await updateSettings({ language: 'xx' as never });
    expect((await getSettings()).language).toBe('de');
  });
});

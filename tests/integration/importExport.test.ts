import { beforeEach, describe, expect, it } from 'vitest';
import { addBookmark, clearBookmarks, listBookmarks } from '../../src/core/storage/bookmarks.js';
import { exportBookmarksJson, importBookmarksJson } from '../../src/core/storage/importExport.js';

beforeEach(async () => { await clearBookmarks(); });

const valid = {
  format: 'wikipedia-quick-search-bookmarks',
  version: 1,
  exportedAt: new Date().toISOString(),
  bookmarks: [
    { id: 'a', title: 'Zelle', language: 'de', canonicalUrl: 'https://de.wikipedia.org/wiki/Zelle', savedAt: 1 }
  ]
};

describe('Import/Export', () => {
  it('Roundtrip: Export -> Import', async () => {
    await addBookmark({ title: 'Atom', language: 'de', canonicalUrl: 'https://de.wikipedia.org/wiki/Atom' });
    const json = await exportBookmarksJson();
    await clearBookmarks();
    const res = await importBookmarksJson(json);
    expect(res.ok).toBe(true);
    expect(res.imported).toBe(1);
    expect(await listBookmarks()).toHaveLength(1);
  });
  it('akzeptiert gültige Importdatei', async () => {
    const res = await importBookmarksJson(JSON.stringify(valid));
    expect(res.ok).toBe(true);
    expect(res.imported).toBe(1);
  });
  it('lehnt unbekanntes Format ab', async () => {
    const res = await importBookmarksJson(JSON.stringify({ foo: 'bar' }));
    expect(res.ok).toBe(false);
  });
  it('lehnt ungültiges JSON ab', async () => {
    expect((await importBookmarksJson('{not json')).ok).toBe(false);
  });
  it('überspringt ungültige Einträge', async () => {
    const mixed = { ...valid, bookmarks: [
      valid.bookmarks[0],
      { title: 'Böse', language: 'de', canonicalUrl: 'https://evil.com/x' }
    ] };
    const res = await importBookmarksJson(JSON.stringify(mixed));
    expect(res.imported).toBe(1);
    expect(res.skipped).toBe(1);
  });
});

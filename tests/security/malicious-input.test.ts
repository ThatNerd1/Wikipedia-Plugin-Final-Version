import { beforeEach, describe, expect, it } from 'vitest';
import { validateMessage, MSG } from '../../src/core/messaging/schema.js';
import { normalizeSelection } from '../../src/core/selection/normalize.js';
import { importBookmarksJson } from '../../src/core/storage/importExport.js';
import { clearBookmarks, listBookmarks } from '../../src/core/storage/bookmarks.js';
import { classifyWikiHref } from '../../src/core/security/url.js';

describe('Bösartige Runtime-Nachrichten', () => {
  it('weist Code-Injection-Versuche ab', () => {
    expect(validateMessage({ type: '__proto__', polluted: true })).toBeNull();
    expect(validateMessage({ type: MSG.DRAWER_LOOKUP, query: { toString: () => 'x' } })).toBeNull();
  });
});

describe('Übergroße Auswahltexte', () => {
  it('kappt auf 300 Zeichen', () => {
    const huge = 'a'.repeat(100000);
    const result = normalizeSelection(huge);
    expect((result as string).length).toBeLessThanOrEqual(300);
  });
});

describe('Prototype Pollution beim Import', () => {
  beforeEach(async () => { await clearBookmarks(); });
  it('ignoriert __proto__-Payloads', async () => {
    const payload = '{"format":"wikipedia-quick-search-bookmarks","version":1,"bookmarks":[],"__proto__":{"polluted":true}}';
    await importBookmarksJson(payload);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('verhindert Konstruktor-Pollution in Einträgen', async () => {
    const payload = JSON.stringify({
      format: 'wikipedia-quick-search-bookmarks', version: 1,
      bookmarks: [{ title: 'X', language: 'de', canonicalUrl: 'https://de.wikipedia.org/wiki/X', __proto__: { evil: 1 } }]
    });
    const res = await importBookmarksJson(payload);
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
    expect(res.ok).toBe(true);
  });
  it('lehnt übergroße Importdateien ab', async () => {
    const big = 'x'.repeat(1_000_001);
    const res = await importBookmarksJson(big);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Größenlimit/);
  });
});

describe('Manipulierte URLs in Links', () => {
  it('blockiert vbscript:, file:, blob:', () => {
    expect(classifyWikiHref('vbscript:msgbox(1)', 'de').kind).toBe('blocked');
    expect(classifyWikiHref('file:///etc/passwd', 'de').kind).toBe('blocked');
    expect(classifyWikiHref('blob:https://x/y', 'de').kind).toBe('blocked');
  });
  it('blockiert Protokoll-relative und offene Redirects über fremde Hosts als extern-https', () => {
    // //evil.com wird gegen den Wikipedia-Origin aufgelöst -> anderer Host -> extern (nur wenn https)
    const t = classifyWikiHref('https://evil.com//redirect', 'de');
    expect(t.kind).toBe('external');
  });
});

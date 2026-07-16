import { describe, expect, it } from 'vitest';
import {
  buildArticleUrl, classifyWikiHref, isSafeExternalUrl, isTrustedImageUrl, isValidWikipediaArticleUrl
} from '../../src/core/security/url.js';

describe('isSafeExternalUrl', () => {
  it('erlaubt nur https', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<x>')).toBe(false);
    expect(isSafeExternalUrl('ftp://x')).toBe(false);
  });
});

describe('isTrustedImageUrl', () => {
  it('erlaubt nur upload.wikimedia.org via https', () => {
    expect(isTrustedImageUrl('https://upload.wikimedia.org/x.jpg')).toBe(true);
    expect(isTrustedImageUrl('https://evil.example.com/x.jpg')).toBe(false);
    expect(isTrustedImageUrl('http://upload.wikimedia.org/x.jpg')).toBe(false);
  });
});

describe('classifyWikiHref', () => {
  it('klassifiziert interne Artikel-Links', () => {
    const t = classifyWikiHref('/wiki/Zelle', 'de');
    expect(t.kind).toBe('internal');
    if (t.kind === 'internal') { expect(t.title).toBe('Zelle'); expect(t.language).toBe('de'); }
  });
  it('erkennt Anker in internen Links', () => {
    const t = classifyWikiHref('/wiki/Zelle#Aufbau', 'de');
    expect(t.kind).toBe('internal');
    if (t.kind === 'internal') expect(t.anchor).toBe('Aufbau');
  });
  it('behandelt reine Anker', () => {
    expect(classifyWikiHref('#Weblinks', 'de')).toEqual({ kind: 'anchor', anchor: 'Weblinks' });
  });
  it('blockiert javascript:- und andere Schemata', () => {
    expect(classifyWikiHref('javascript:alert(1)', 'de').kind).toBe('blocked');
    expect(classifyWikiHref('data:text/html,x', 'de').kind).toBe('blocked');
  });
  it('behandelt Spezial-/Datei-Namespaces als extern', () => {
    expect(classifyWikiHref('/wiki/Datei:Foo.jpg', 'de').kind).toBe('external');
    expect(classifyWikiHref('/wiki/Spezial:Suche', 'de').kind).toBe('external');
  });
  it('behandelt fremde Domains als extern (https)', () => {
    const t = classifyWikiHref('https://example.com/page', 'de');
    expect(t.kind).toBe('external');
  });
});

describe('buildArticleUrl & Validierung', () => {
  it('baut kanonische URLs mit Encoding', () => {
    expect(buildArticleUrl('de', 'Erwin Schrödinger')).toBe('https://de.wikipedia.org/wiki/Erwin_Schr%C3%B6dinger');
  });
  it('validiert importierte URLs', () => {
    expect(isValidWikipediaArticleUrl('https://de.wikipedia.org/wiki/Zelle')).toBe(true);
    expect(isValidWikipediaArticleUrl('https://evil.com/wiki/Zelle')).toBe(false);
    expect(isValidWikipediaArticleUrl('http://de.wikipedia.org/wiki/Zelle')).toBe(false);
    expect(isValidWikipediaArticleUrl(42)).toBe(false);
  });
});

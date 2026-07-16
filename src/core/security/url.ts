import { LanguageCode, isSupportedLanguage, wikipediaOrigin } from './languages.js';

/** Nur https für externe Links. javascript:, data:, vbscript:, file: usw. sind verboten. */
export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Bilder ausschließlich von vertrauenswürdigen Wikimedia-Hosts. */
const TRUSTED_IMAGE_HOSTS = new Set(['upload.wikimedia.org']);

export function isTrustedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw, 'https://upload.wikimedia.org/');
    return url.protocol === 'https:' && TRUSTED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export type WikiLinkTarget =
  | { kind: 'internal'; title: string; language: LanguageCode; anchor: string | null }
  | { kind: 'anchor'; anchor: string }
  | { kind: 'external'; url: string }
  | { kind: 'blocked' };

const WIKI_HOST_RE = /^([a-z]{2,3})\.(?:m\.)?wikipedia\.org$/;
const NON_ARTICLE_NS_RE =
  /^(Spezial|Special|Datei|File|Kategorie|Category|Hilfe|Help|Wikipedia|Portal|Vorlage|Template|Diskussion|Talk|Benutzer|User|Modul|Module|MediaWiki)([ _]?(Diskussion|talk))?:/i;

/**
 * Klassifiziert einen href aus (sanitisiertem) MediaWiki-HTML.
 * Interne Artikel-Links werden auf die Panel-Navigation umgeschrieben,
 * externe Links nur als https zugelassen. Alles andere wird blockiert.
 */
export function classifyWikiHref(rawHref: string, contextLang: LanguageCode): WikiLinkTarget {
  const href = rawHref.trim();
  if (href === '') return { kind: 'blocked' };
  if (href.startsWith('#')) {
    const anchor = href.slice(1);
    return anchor ? { kind: 'anchor', anchor } : { kind: 'blocked' };
  }
  let url: URL;
  try {
    url = new URL(href, wikipediaOrigin(contextLang));
  } catch {
    return { kind: 'blocked' };
  }
  if (url.protocol !== 'https:') return { kind: 'blocked' };

  const hostMatch = WIKI_HOST_RE.exec(url.hostname);
  if (hostMatch && url.pathname.startsWith('/wiki/')) {
    const lang = hostMatch[1];
    if (!isSupportedLanguage(lang)) {
      // Sprachversion außerhalb der Allowlist: als externer Link behandeln.
      return { kind: 'external', url: url.href };
    }
    const rawTitle = url.pathname.slice('/wiki/'.length);
    let title: string;
    try {
      title = decodeURIComponent(rawTitle).replace(/_/g, ' ').trim();
    } catch {
      return { kind: 'blocked' };
    }
    if (!title || title.length > 300) return { kind: 'blocked' };
    if (NON_ARTICLE_NS_RE.test(title)) {
      return { kind: 'external', url: url.href };
    }
    const anchor = url.hash ? url.hash.slice(1) : null;
    return { kind: 'internal', title, language: lang, anchor };
  }
  return { kind: 'external', url: url.href };
}

/** Kanonische Artikel-URL – ausschließlich aus Allowlist-Origin + encodeURIComponent. */
export function buildArticleUrl(lang: LanguageCode, title: string): string {
  const normalized = title.trim().replace(/\s+/g, '_');
  return `${wikipediaOrigin(lang)}/wiki/${encodeURIComponent(normalized)}`;
}

/** Beschreibungsseite einer Bilddatei (für Urheber-/Lizenzinformationen). */
export function buildFilePageUrl(lang: LanguageCode, fileName: string): string | null {
  const clean = fileName.trim();
  if (!clean || clean.length > 300 || /[<>"]/.test(clean)) return null;
  return `${wikipediaOrigin(lang)}/wiki/${encodeURIComponent('File:' + clean.replace(/\s+/g, '_'))}`;
}

/** Validiert eine (z. B. importierte) kanonische Wikipedia-Artikel-URL. */
export function isValidWikipediaArticleUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length > 2000) return false;
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      WIKI_HOST_RE.test(url.hostname) &&
      url.pathname.startsWith('/wiki/') &&
      url.pathname.length > '/wiki/'.length
    );
  } catch {
    return false;
  }
}

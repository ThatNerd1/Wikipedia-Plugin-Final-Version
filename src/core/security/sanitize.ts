import DOMPurify from 'dompurify';
import { LanguageCode } from './languages.js';
import { classifyWikiHref, isTrustedImageUrl } from './url.js';

/**
 * Sanitisiert MediaWiki-HTML mit strenger Allowlist.
 * Das HTML wird als vollständig NICHT vertrauenswürdig behandelt:
 * - keine Scripts, Styles, Formulare, iframes, Objekte, Event-Handler
 * - Links werden klassifiziert und auf Panel-Navigation umgeschrieben
 * - Bilder nur von upload.wikimedia.org, mit Lazy Loading
 */

const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'blockquote', 'br', 'caption', 'cite', 'code', 'dd',
  'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hr', 'i', 'img', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q',
  's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr'
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'dir', 'lang', 'id',
  'datetime', 'scope', 'width', 'height'
];

export interface SanitizeOptions {
  language: LanguageCode;
}

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    const tag = el.tagName?.toLowerCase();

    if (tag === 'a') {
      const lang = (currentLanguage ?? 'de') as LanguageCode;
      const href = el.getAttribute('href') ?? '';
      const target = classifyWikiHref(href, lang);
      el.removeAttribute('target');
      el.removeAttribute('rel');
      switch (target.kind) {
        case 'internal':
          el.setAttribute('href', '#');
          el.setAttribute('data-wqs-internal', target.title);
          el.setAttribute('data-wqs-lang', target.language);
          if (target.anchor) el.setAttribute('data-wqs-anchor', target.anchor);
          break;
        case 'anchor':
          el.setAttribute('href', '#');
          el.setAttribute('data-wqs-anchor', target.anchor);
          break;
        case 'external':
          el.setAttribute('href', target.url);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
          el.setAttribute('data-wqs-external', '1');
          break;
        default:
          el.removeAttribute('href');
      }
    }

    if (tag === 'img') {
      let src = el.getAttribute('src') ?? '';
      if (src.startsWith('//')) src = 'https:' + src;
      if (!isTrustedImageUrl(src)) {
        el.remove();
        return;
      }
      el.setAttribute('src', src);
      el.removeAttribute('srcset');
      el.setAttribute('loading', 'lazy');
      el.setAttribute('decoding', 'async');
      el.setAttribute('referrerpolicy', 'no-referrer');
    }
  });
}

let currentLanguage: LanguageCode | null = null;

/** Sanitisiert nicht vertrauenswürdiges MediaWiki-HTML zu sicherem HTML. */
export function sanitizeWikiHtml(untrustedHtml: string, options: SanitizeOptions): string {
  installHooks();
  currentLanguage = options.language;
  try {
    return DOMPurify.sanitize(untrustedHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      // Relative und protokoll-relative URLs dürfen DOMPurifys URI-Filter passieren,
      // weil jede <a>/<img>-URL im afterSanitizeAttributes-Hook erneut streng
      // validiert und neu geschrieben wird (classifyWikiHref / isTrustedImageUrl).
      ALLOWED_URI_REGEXP: /^(?:https:|#|\/)/i,
      ADD_ATTR: ['data-wqs-internal', 'data-wqs-lang', 'data-wqs-anchor', 'data-wqs-external', 'target', 'rel', 'loading', 'decoding', 'referrerpolicy'],
      FORBID_TAGS: ['style', 'form', 'input', 'button', 'select', 'textarea', 'iframe', 'object', 'embed', 'audio', 'video', 'math', 'svg', 'base', 'link', 'meta'],
      FORBID_ATTR: ['style', 'srcset', 'formaction', 'xlink:href', 'action', 'background', 'ping'],
      KEEP_CONTENT: true,
      RETURN_TRUSTED_TYPE: false,
      USE_PROFILES: { html: true },
      SANITIZE_DOM: true
    }) as unknown as string;
  } finally {
    currentLanguage = null;
  }
}

/**
 * Setzt bereits sanitisiertes HTML in einen Container ein - OHNE innerHTML.
 * Die (mit DOMPurify vorab bereinigte) HTML-Zeichenkette wird über DOMParser zu
 * inerten DOM-Knoten geparst - dabei werden keine Scripts ausgeführt und keine
 * Event-Handler aktiv - und anschließend in den Container eingehängt. Dadurch
 * entfällt jede innerHTML-Zuweisung (auch für statische Analyse unbedenklich).
 */
export function setSanitizedHtml(container: Element, sanitizedHtml: string): void {
  const parsed = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  const fragment = document.createDocumentFragment();
  for (const node of Array.from(parsed.body.childNodes)) {
    fragment.appendChild(document.importNode(node, true));
  }
  container.replaceChildren(fragment);
}

/** Entfernt HTML-Tags aus API-Snippets und liefert reinen Text. */
export function snippetToText(untrustedSnippet: string): string {
  const sanitized = DOMPurify.sanitize(untrustedSnippet, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const div = document.createElement('div');
  setSanitizedHtml(div, sanitized);
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

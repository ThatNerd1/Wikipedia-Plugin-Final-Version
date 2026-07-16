export const MAX_SELECTION_LENGTH = 300;

/**
 * Steuer- und unsichtbare Zeichen: C0/C1-Steuerzeichen, Zero-Width-Zeichen,
 * BiDi-Steuerzeichen und BOM. Bewusst über Escape-Sequenzen definiert.
 */
/* eslint-disable no-control-regex -- Steuer-/Unsichtbarkeitszeichen sollen bewusst entfernt werden. */
const INVISIBLE_RE = new RegExp(
  '[\\u0000-\\u001F\\u007F-\\u009F\\u00AD\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g'
);
/* eslint-enable no-control-regex */

/**
 * Normalisiert eine Textauswahl als NICHT vertrauenswürdige Eingabe.
 * Gibt null zurück, wenn nach Bereinigung nichts Sinnvolles übrig bleibt.
 */
export function normalizeSelection(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let text = raw.normalize('NFC');
  text = text.replace(INVISIBLE_RE, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length === 0) return null;
  // Mindestens ein Buchstabe oder eine Ziffer, sonst keine Suche.
  if (!/[\p{L}\p{N}]/u.test(text)) return null;
  if (text.length > MAX_SELECTION_LENGTH) {
    text = text.slice(0, MAX_SELECTION_LENGTH);
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > MAX_SELECTION_LENGTH / 2) text = text.slice(0, lastSpace);
    text = text.trim();
  }
  return text.length > 0 ? text : null;
}

/**
 * Fallback-Queries für lange Auswahlen: erst die volle Auswahl, dann kürzere
 * Präfixe. Bewusst keine englischen Stemming-Heuristiken – das Ranking
 * übernimmt die MediaWiki-Suche.
 */
export function deriveFallbackQueries(query: string): string[] {
  const out: string[] = [];
  const push = (q: string) => {
    const t = q.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  push(query);
  const words = query.split(' ').filter(Boolean);
  if (words.length > 6) push(words.slice(0, 6).join(' '));
  if (words.length > 3) push(words.slice(0, 3).join(' '));
  if (words.length > 1) push(words[0] ?? '');
  return out;
}

/** Entfernt umschließende Anführungszeichen/Klammern und Randsatzzeichen. */
const EDGE_PUNCT = '[\\s"\'«»\\u201E\\u201C\\u201D\\u201A\\u2018\\u2019()\\[\\]{},.;:!?\\u2013\\u2014-]+';
export function stripSurroundingPunctuation(text: string): string {
  return text.replace(new RegExp('^' + EDGE_PUNCT), '').replace(new RegExp(EDGE_PUNCT + '$'), '');
}

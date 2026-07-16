import { SearchResult } from './types.js';

/**
 * Konservative Auswahlregel für das automatische Öffnen eines Artikels:
 * Nur wenn der Top-Treffer die Query (fallunabhängig, whitespace-normalisiert)
 * exakt trifft oder es genau einen Treffer gibt, wird direkt geöffnet.
 * Begriffsklärungsseiten werden nie automatisch geöffnet.
 * Es wird niemals ein Artikel „erfunden“ – im Zweifel entscheidet der Nutzer.
 */
export function pickAutoOpenResult(results: SearchResult[], query: string): SearchResult | null {
  if (results.length === 0) return null;
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const q = norm(query);
  const top = results[0];
  if (!top) return null;
  if (top.isDisambiguation) return null;
  if (results.length === 1) return top;
  if (norm(top.title) === q) return top;
  return null;
}

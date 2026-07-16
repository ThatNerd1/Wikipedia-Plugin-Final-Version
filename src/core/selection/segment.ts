/** Minimale Typdeklaration, falls die TS-Lib Intl.Segmenter nicht kennt. */
interface SegmentData { segment: string; index: number; isWordLike?: boolean }
interface SegmenterLike { segment(input: string): Iterable<SegmentData> }
interface SegmenterCtor { new (locale?: string, options?: { granularity: 'word' }): SegmenterLike }

function getSegmenter(locale: string): SegmenterLike | null {
  const IntlAny = Intl as unknown as { Segmenter?: SegmenterCtor };
  if (typeof IntlAny.Segmenter !== 'function') return null;
  try {
    return new IntlAny.Segmenter(locale, { granularity: 'word' });
  } catch {
    return null;
  }
}

const WORD_CHAR_RE = /[\p{L}\p{M}\p{N}’'-]/u;

/**
 * Ermittelt das Wort an einer Zeichenposition innerhalb eines Textknotens.
 * Bevorzugt Intl.Segmenter, mit Unicode-tauglichem Regex-Fallback.
 */
export function wordAt(text: string, offset: number, locale = 'de'): string | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  const pos = Math.max(0, Math.min(offset, text.length - 1));

  const segmenter = getSegmenter(locale);
  if (segmenter) {
    for (const seg of segmenter.segment(text)) {
      const start = seg.index;
      const end = seg.index + seg.segment.length;
      if (pos >= start && pos < end) {
        return seg.isWordLike ? seg.segment : null;
      }
    }
    return null;
  }

  // Fallback: Wortgrenzen über Unicode-Property-Escapes bestimmen.
  if (!WORD_CHAR_RE.test(text[pos] ?? '')) return null;
  let start = pos;
  while (start > 0 && WORD_CHAR_RE.test(text[start - 1] ?? '')) start--;
  let end = pos;
  while (end < text.length && WORD_CHAR_RE.test(text[end] ?? '')) end++;
  const word = text.slice(start, end).replace(/^[-'’]+|[-'’]+$/g, '');
  return /[\p{L}\p{N}]/u.test(word) ? word : null;
}

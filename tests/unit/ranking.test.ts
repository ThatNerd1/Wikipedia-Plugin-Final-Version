import { describe, expect, it } from 'vitest';
import { pickAutoOpenResult } from '../../src/core/wikipedia/ranking.js';
import { SearchResult } from '../../src/core/wikipedia/types.js';

const r = (title: string, extra: Partial<SearchResult> = {}): SearchResult => ({
  title, snippet: '', pageId: Math.random(), isDisambiguation: false, isRedirect: false, ...extra
});

describe('pickAutoOpenResult', () => {
  it('öffnet automatisch bei genau einem Treffer', () => {
    expect(pickAutoOpenResult([r('Zelle')], 'Zelle')?.title).toBe('Zelle');
  });
  it('öffnet automatisch bei exaktem Titel-Match', () => {
    expect(pickAutoOpenResult([r('Zelle'), r('Zellwand')], 'zelle')?.title).toBe('Zelle');
  });
  it('öffnet nichts bei mehrdeutigen Treffern ohne exaktes Match', () => {
    expect(pickAutoOpenResult([r('Tiny Tim'), r('Tiny Desk')], 'Tiny')).toBeNull();
  });
  it('öffnet niemals Begriffsklärungsseiten automatisch', () => {
    expect(pickAutoOpenResult([r('Merkur', { isDisambiguation: true })], 'Merkur')).toBeNull();
  });
  it('erfindet nichts bei leeren Ergebnissen', () => {
    expect(pickAutoOpenResult([], 'x')).toBeNull();
  });
});

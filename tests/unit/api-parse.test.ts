import { describe, expect, it } from 'vitest';
import { stripSnippetHtml } from '../../src/core/wikipedia/api.js';

describe('stripSnippetHtml', () => {
  it('entfernt searchmatch-Spans und dekodiert Entities', () => {
    expect(stripSnippetHtml('Die <span class="searchmatch">Zelle</span> ist &amp; klein'))
      .toBe('Die Zelle ist & klein');
  });
  it('entfernt beliebige Tags', () => {
    expect(stripSnippetHtml('<b onclick="x()">Test</b>')).toBe('Test');
  });
  it('normalisiert Whitespace', () => {
    expect(stripSnippetHtml('a\n\n  b')).toBe('a b');
  });
});

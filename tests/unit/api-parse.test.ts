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
  it('entfernt verschachtelte/überlappende Tags (kein öffnender Tag bleibt übrig)', () => {
    // Ein einzelner Durchlauf ließe "<script>" zurück; die Schleife entfernt alle
    // öffnenden Tags. Sicherheitsrelevant ist: kein "<" bleibt bestehen.
    const out = stripSnippetHtml('<scr<script>ipt>alert(1)</scr</script>ipt>');
    expect(out).not.toContain('<');
    expect(out).toContain('alert(1)');
    expect(stripSnippetHtml('<<b>b>fett<</b>/b>')).not.toContain('<');
  });
});

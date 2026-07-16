import { describe, expect, it } from 'vitest';
import { sanitizeWikiHtml, snippetToText } from '../../src/core/security/sanitize.js';

const clean = (html: string) => sanitizeWikiHtml(html, { language: 'de' });

describe('Sanitizer – XSS-Abwehr', () => {
  it('entfernt <script>', () => {
    const out = clean('<p>Text</p><script>alert(1)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('Text');
  });
  it('entfernt Inline-Event-Handler', () => {
    const out = clean('<p onclick="alert(1)" onmouseover="steal()">Hi</p>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/onmouseover/i);
  });
  it('entfernt <img onerror>', () => {
    const out = clean('<img src="x" onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
  });
  it('neutralisiert javascript:-Links', () => {
    const out = clean('<a href="javascript:alert(1)">klick</a>');
    expect(out).not.toMatch(/javascript:/i);
  });
  it('entfernt data:-URIs', () => {
    const out = clean('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(out).not.toMatch(/data:text\/html/i);
  });
  it('entfernt <iframe>, <object>, <form>, <style>', () => {
    const out = clean('<iframe src="evil"></iframe><object data="x"></object><form action="y"></form><style>*{}</style>');
    expect(out).not.toMatch(/<iframe|<object|<form|<style/i);
  });
  it('entfernt <svg> mit eingebettetem Script', () => {
    const out = clean('<svg><script>alert(1)</script></svg>');
    expect(out).not.toMatch(/<svg|<script/i);
  });
  it('blockiert nicht vertrauenswürdige Bild-Hosts', () => {
    const out = clean('<img src="https://evil.example.com/x.jpg">');
    expect(out.includes('evil.example.com')).toBe(false);
  });
  it('erlaubt vertrauenswürdige Wikimedia-Bilder mit lazy loading', () => {
    const out = clean('<img src="https://upload.wikimedia.org/a.jpg">');
    expect(out.includes('upload.wikimedia.org')).toBe(true);
    expect(out).toMatch(/loading="lazy"/);
  });
  it('schreibt interne Links auf data-Attribute um', () => {
    const out = clean('<a href="/wiki/Zelle">Zelle</a>');
    expect(out).toMatch(/data-wqs-internal="Zelle"/);
    expect(out).not.toMatch(/href="\/wiki\/Zelle"/);
  });
  it('markiert externe Links mit noopener noreferrer', () => {
    const out = clean('<a href="https://example.com">ext</a>');
    expect(out).toMatch(/rel="noopener noreferrer"/);
    expect(out).toMatch(/target="_blank"/);
  });
  it('behält harmlosen strukturellen Inhalt', () => {
    const out = clean('<h2>Titel</h2><p>Absatz mit <b>fett</b> und <i>kursiv</i>.</p><ul><li>Punkt</li></ul>');
    expect(out).toMatch(/<h2>Titel<\/h2>/);
    expect(out).toMatch(/<b>fett<\/b>/);
    expect(out).toMatch(/<li>Punkt<\/li>/);
  });
});

describe('snippetToText', () => {
  it('liefert reinen Text ohne Markup', () => {
    expect(snippetToText('<b>Zelle</b> <script>x</script>')).toBe('Zelle');
  });
});

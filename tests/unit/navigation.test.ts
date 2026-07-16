import { describe, expect, it } from 'vitest';
import { NavigationStack } from '../../src/core/navigation/stack.js';

const entry = (title: string) => ({
  title, language: 'de' as const, canonicalUrl: `https://de.wikipedia.org/wiki/${title}`, timestamp: Date.now()
});

describe('NavigationStack', () => {
  it('startet leer', () => {
    const s = new NavigationStack();
    expect(s.current).toBeNull();
    expect(s.canGoBack).toBe(false);
  });
  it('pusht und navigiert zurück', () => {
    const s = new NavigationStack();
    s.push(entry('A')); s.push(entry('B')); s.push(entry('C'));
    expect(s.current?.title).toBe('C');
    expect(s.canGoBack).toBe(true);
    expect(s.back()?.title).toBe('B');
    expect(s.back()?.title).toBe('A');
    expect(s.canGoBack).toBe(false);
    expect(s.back()).toBeNull();
  });
  it('stapelt unmittelbare Duplikate nicht', () => {
    const s = new NavigationStack();
    s.push(entry('A')); s.push(entry('A'));
    expect(s.depth).toBe(1);
  });
  it('verwirft Vorwärtseinträge nach neuem Push', () => {
    const s = new NavigationStack();
    s.push(entry('A')); s.push(entry('B'));
    s.back();
    s.push(entry('C'));
    expect(s.current?.title).toBe('C');
    expect(s.back()?.title).toBe('A');
  });
});

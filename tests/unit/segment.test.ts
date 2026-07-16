import { describe, expect, it } from 'vitest';
import { wordAt } from '../../src/core/selection/segment.js';

describe('wordAt', () => {
  it('findet das Wort an einer Position (deutscher Text)', () => {
    const text = 'Die Photosynthese ist wichtig';
    expect(wordAt(text, 6, 'de')).toBe('Photosynthese');
  });
  it('behandelt Umlaute und ß korrekt', () => {
    const text = 'Größe und Straße';
    expect(wordAt(text, 2, 'de')).toBe('Größe');
    expect(wordAt(text, 12, 'de')).toBe('Straße');
  });
  it('gibt null für Positionen auf Leerzeichen/Satzzeichen zurück', () => {
    const text = 'a , b';
    expect(wordAt(text, 2, 'de')).toBeNull();
  });
  it('behandelt Wortanfang und -ende', () => {
    expect(wordAt('Zelle', 0, 'de')).toBe('Zelle');
    expect(wordAt('Zelle', 4, 'de')).toBe('Zelle');
  });
  it('gibt null für leere Eingaben zurück', () => {
    expect(wordAt('', 0, 'de')).toBeNull();
  });
});

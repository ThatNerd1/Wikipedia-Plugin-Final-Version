import { describe, expect, it } from 'vitest';
import {
  MAX_SELECTION_LENGTH, deriveFallbackQueries, normalizeSelection, stripSurroundingPunctuation
} from '../../src/core/selection/normalize.js';

describe('normalizeSelection', () => {
  it('trimmt und kollabiert Whitespace/Zeilenumbrüche', () => {
    expect(normalizeSelection('  Foto\n synthese \t ')).toBe('Foto synthese');
  });
  it('führt Unicode-NFC-Normalisierung durch', () => {
    const decomposed = 'Café'; // e + combining acute
    expect(normalizeSelection(decomposed)).toBe('Café');
  });
  it('entfernt unsichtbare/Steuerzeichen und lehnt reine Unsichtbarkeit ab', () => {
    expect(normalizeSelection('​​﻿')).toBeNull();
    expect(normalizeSelection('a​b')).toBe('a b');
  });
  it('lehnt reine Satzzeichen ab', () => {
    expect(normalizeSelection('!!! ??? ...')).toBeNull();
  });
  it('lehnt Nicht-Strings ab', () => {
    expect(normalizeSelection(null)).toBeNull();
    expect(normalizeSelection(42 as unknown)).toBeNull();
    expect(normalizeSelection(undefined)).toBeNull();
  });
  it('begrenzt auf maximal 300 Zeichen an einer Wortgrenze', () => {
    const long = 'wort '.repeat(200);
    const result = normalizeSelection(long);
    expect(result).not.toBeNull();
    expect((result as string).length).toBeLessThanOrEqual(MAX_SELECTION_LENGTH);
    expect(result).not.toMatch(/\s$/);
  });
});

describe('deriveFallbackQueries', () => {
  it('gibt die volle Query zuerst zurück', () => {
    expect(deriveFallbackQueries('Photosynthese')[0]).toBe('Photosynthese');
  });
  it('erzeugt kürzere Präfixe für lange Sätze', () => {
    const q = 'die zelluläre Seneszenz ist ein wichtiger biologischer Prozess bei Alterung';
    const fallbacks = deriveFallbackQueries(q);
    expect(fallbacks[0]).toBe(q);
    expect(fallbacks.length).toBeGreaterThan(1);
    expect(fallbacks[fallbacks.length - 1]).toBe('die');
  });
  it('dedupliziert', () => {
    const fallbacks = deriveFallbackQueries('Wort');
    expect(new Set(fallbacks).size).toBe(fallbacks.length);
  });
});

describe('stripSurroundingPunctuation', () => {
  it('entfernt umschließende Anführungszeichen und Klammern', () => {
    expect(stripSurroundingPunctuation('„Melatonin“')).toBe('Melatonin');
    expect(stripSurroundingPunctuation('(Zelle)')).toBe('Zelle');
    expect(stripSurroundingPunctuation('Wort.')).toBe('Wort');
  });
});

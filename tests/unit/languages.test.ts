import { describe, expect, it } from 'vitest';
import {
  apiEndpoint, coerceLanguage, detectLanguageFromTag, isSupportedLanguage, wikipediaOrigin
} from '../../src/core/security/languages.js';

describe('Sprachvalidierung', () => {
  it('akzeptiert nur Allowlist-Codes', () => {
    expect(isSupportedLanguage('de')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('xx')).toBe(false);
    expect(isSupportedLanguage('de-DE')).toBe(false);
    expect(isSupportedLanguage(123)).toBe(false);
  });
  it('coerceLanguage fällt auf Default zurück', () => {
    expect(coerceLanguage('fr')).toBe('fr');
    expect(coerceLanguage('klingon')).toBe('de');
    expect(coerceLanguage(null)).toBe('de');
  });
  it('detectLanguageFromTag liest Primärsprache', () => {
    expect(detectLanguageFromTag('en-US')).toBe('en');
    expect(detectLanguageFromTag('de')).toBe('de');
    expect(detectLanguageFromTag('zz-ZZ')).toBeNull();
    expect(detectLanguageFromTag(null)).toBeNull();
  });
  it('baut Origins nur aus der Allowlist', () => {
    expect(wikipediaOrigin('de')).toBe('https://de.wikipedia.org');
    expect(apiEndpoint('en')).toBe('https://en.wikipedia.org/w/api.php');
    expect(() => wikipediaOrigin('evil' as never)).toThrow();
  });
});

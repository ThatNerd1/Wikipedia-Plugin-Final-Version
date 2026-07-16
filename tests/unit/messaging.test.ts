import { describe, expect, it } from 'vitest';
import { MSG, isTrustedSender, validateMessage } from '../../src/core/messaging/schema.js';

describe('validateMessage', () => {
  it('akzeptiert gültige LOOKUP_SELECTION', () => {
    const m = validateMessage({ type: MSG.LOOKUP_SELECTION, text: 'Zelle', source: 'shortcut' });
    expect(m?.type).toBe(MSG.LOOKUP_SELECTION);
  });
  it('lehnt falsche source ab', () => {
    expect(validateMessage({ type: MSG.LOOKUP_SELECTION, text: 'x', source: 'evil' })).toBeNull();
  });
  it('lehnt fehlende Felder ab', () => {
    expect(validateMessage({ type: MSG.PANEL_SEARCH })).toBeNull();
    expect(validateMessage({ type: MSG.SET_ONCLICK_STATE, enabled: 'yes' })).toBeNull();
  });
  it('lehnt unbekannte Typen ab', () => {
    expect(validateMessage({ type: 'evil/exec', code: 'x' })).toBeNull();
    expect(validateMessage(null)).toBeNull();
    expect(validateMessage('string')).toBeNull();
  });
  it('lehnt überlange Texte ab', () => {
    expect(validateMessage({ type: MSG.LOOKUP_SELECTION, text: 'a'.repeat(5000), source: 'manual' })).toBeNull();
  });
});

describe('isTrustedSender', () => {
  it('akzeptiert nur die eigene Runtime-ID', () => {
    expect(isTrustedSender({ id: 'abc' }, 'abc')).toBe(true);
    expect(isTrustedSender({ id: 'other' }, 'abc')).toBe(false);
    expect(isTrustedSender(undefined, 'abc')).toBe(false);
  });
});

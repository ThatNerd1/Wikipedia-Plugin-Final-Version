import { describe, expect, it } from 'vitest';
import { sanitizeWikiHtml } from '../../src/core/security/sanitize.js';

// Auswahl aus der OWASP-XSS-Filter-Evasion-Sammlung, an MediaWiki-HTML angepasst.
const PAYLOADS = [
  '<IMG SRC="javascript:alert(1)">',
  '<IMG SRC=javascript:alert(1)>',
  '<IMG SRC=JaVaScRiPt:alert(1)>',
  '<IMG SRC=`javascript:alert(1)`>',
  '<a href="jav&#x09;ascript:alert(1)">x</a>',
  '<IMG SRC="jav\tascript:alert(1);">',
  '<BODY ONLOAD=alert(1)>',
  '<svg/onload=alert(1)>',
  '<iframe src="javascript:alert(1)">',
  '<input onfocus=alert(1) autofocus>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '<div style="background:url(javascript:alert(1))">x</div>',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>'
];

describe('XSS-Payload-Batterie', () => {
  for (const payload of PAYLOADS) {
    it(`neutralisiert: ${payload.slice(0, 40)}`, () => {
      const out = sanitizeWikiHtml(payload, { language: 'de' });
      expect(out).not.toMatch(/<script/i);
      expect(out).not.toMatch(/onerror|onload|onfocus|onclick/i);
      expect(out).not.toMatch(/javascript:/i);
      expect(out).not.toMatch(/<iframe|<svg|<math|<body|<input/i);
    });
  }
});

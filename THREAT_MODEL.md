# Threat Model

## Vertrauensgrenzen

1. **Host-Webseite** – vollständig nicht vertrauenswürdig. Kann beliebiges DOM,
   Skripte und manipulierte Selektionen liefern.
2. **Content Script** – teilweise vertrauenswürdig, läuft aber im Kontext der Hostseite.
3. **Background Service Worker** – vertrauenswürdiger Extension-Kontext.
4. **Side Panel / Sidebar** – vertrauenswürdiger Extension-Kontext, rendert jedoch
   nicht vertrauenswürdige API-Inhalte.
5. **MediaWiki-API** – halb vertrauenswürdig: authentische Quelle, liefert aber HTML,
   das Nutzer editieren können (potenzielle XSS-Vektoren).
6. **Gespeicherte lokale Daten** – vertrauenswürdig, aber integritätsgeprüft beim Lesen.
7. **Importierte JSON-Dateien** – nicht vertrauenswürdig.
8. **PDF-Inhalte** – nicht vertrauenswürdig (können eingebettete Skripte/Aktionen enthalten).

## Angriffe und Gegenmaßnahmen

| Bedrohung | Vektor | Gegenmaßnahme |
|---|---|---|
| XSS über Artikel-HTML | Manipuliertes MediaWiki-HTML | DOMPurify mit strenger Allowlist; einziger innerHTML-Sink; Trusted Types wo verfügbar; CSP `script-src 'self'` |
| XSS über Titel/Beschreibung/Snippet | API-Felder | Nur `textContent`; Snippets werden getrennt bereinigt |
| javascript:/data:/vbscript:-Links | Links im Artikel | `classifyWikiHref` + `ALLOWED_URI_REGEXP`; nur `https:` extern |
| Offene Redirects / SSRF | Nutzergelieferte URLs | Keine serverseitigen Abrufe; nur Wikipedia-Allowlist-Origins; keine beliebigen Fetches |
| Bild-Exfiltration / Tracking-Pixel | `<img>` aus HTML | Nur `upload.wikimedia.org`; `referrerpolicy=no-referrer` |
| Bösartige Runtime-Nachrichten | `runtime.sendMessage` | Schemavalidierung (`validateMessage`) + Absenderprüfung (`isTrustedSender`) |
| Prototype Pollution | JSON-Import | Reviver blockiert `__proto__/constructor/prototype`; Schemavalidierung pro Eintrag |
| Übergroße Eingaben (DoS) | Selektion / Import / HTML | Längenlimits (300 Zeichen Auswahl, 1 MB Import, 5 MB HTML) |
| Race Conditions | Tabwechsel / Panelnavigation | `AbortController` pro Anfrage; pending lookup mit TTL; Stack pro Sprache/Panel |
| Rechteausweitung | Unnötige Permissions | Minimale Basisrechte; Host-Rechte optional & zur Laufzeit; widerrufbar |
| Datenabfluss | Telemetrie/Backend | Kein Backend, keine Telemetrie; Netzwerk nur zu Wikipedia (CSP `connect-src`) |
| Code-Injection | eval/Function/Remote JS | Kein eval/Function im eigenen Code; keine Remote-Scripts; ESLint-Regeln erzwingen dies |
| PDF-Skriptausführung | Eingebettete PDF-Aktionen | PDF.js mit `enableScripting:false`, `isEvalSupported:false` |

## Nicht adressiert (Restrisiko)

- Kompromittierung von Wikipedia selbst (out of scope; Attribution und Volltext-Link
  verweisen transparent auf die Originalquelle).
- Der gebündelte PDF.js-Worker enthält statisch einen `Function`-Konstruktor
  (Drittcode). Zur Laufzeit deaktiviert `isEvalSupported:false` diesen Pfad.

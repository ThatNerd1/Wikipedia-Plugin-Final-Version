# Tests

## Werkzeuge

- **Vitest** (jsdom) für Unit-, Integrations- und Security-Tests.
- **Playwright** für automatisierbare Chromium-Extension-Flows (Setup enthalten).
- **web-ext lint** für Firefox-Smoke-Tests.
- **Safari:** dokumentierte manuelle Testmatrix (keine vorgetäuschten automatisierten Tests).

## Befehle

```bash
npm run test            # Unit + Integration
npm run test:security   # Security-Suite
npm run test:all        # alles (Vitest)
npm run test:e2e        # Playwright (Chromium, lokal gebauter Build nötig)
npm run lint:webext     # web-ext lint auf dist/firefox
```

## Tatsächlich ausgeführte Ergebnisse (letzter Lauf)

- **TypeScript** `tsc --noEmit`: **0 Fehler** (strict).
- **ESLint**: **0 Fehler / 0 Warnungen**.
- **Vitest** (Unit + Integration + Security): **97 Tests, 13 Dateien, alle grün.**
  - Textnormalisierung, Unicode-Wortsegmentierung, URL-/Sprachvalidierung,
    API-Response-Parsing, Ergebnis-Ranking, History-Deduplizierung & -Limit,
    Bookmark-Importvalidierung, Navigationsstack, Message-Schema, Sanitizer-Konfiguration.
  - Security: XSS-Payload-Batterie (14 Payloads), `javascript:`/`data:`/manipulierte
    URLs, Event-Handler in Mock-HTML, bösartige Runtime-Nachrichten, übergroße
    Auswahltexte, fehlerhafte JSON-Importe, Prototype-Pollution-Payloads.
- **web-ext lint** (`dist/firefox`): **0 Fehler**, 7 Warnungen, 1 Notiz. Alle
  Warnungen betreffen den gebündelten Drittanbieter-`pdf.worker.min.mjs`
  (`Function`-Konstruktor) bzw. dessen Import – siehe `SECURITY.md`.
- **npm audit --omit=dev**: **0 Schwachstellen.**
- **Builds** `chromium/firefox/safari`: erfolgreich. **Pakete**: ZIP + XPI erzeugt.

## Testabdeckung nach Kategorie

### Unit (`tests/unit/`)
`normalize`, `segment`, `languages`, `url`, `navigation`, `ranking`, `messaging`, `api-parse`.

### Integration (`tests/integration/`)
`storage` (History/Bookmarks/Settings inkl. Incognito & Limit), `importExport`
(Roundtrip, Formatvalidierung, Skips).

### Security (`tests/security/`)
`sanitize`, `xss-payloads`, `malicious-input` (inkl. Prototype Pollution & übergroße Importe).

### E2E (`tests/e2e/`, Playwright)
Gerüst für: Shortcut mit/ohne Auswahl, Panel öffnen/schließen, Zurücknavigation,
Suchtrefferauswahl, interne Links, On-Click an/aus, History deaktivieren/löschen,
Artikel speichern/entfernen, API-Ausfall, Offline, eingeschränkte Seiten, PDF-Fallback,
PDF.js-Viewer. Ausführung erfordert lokal installierte Playwright-Browser und
`npm run build:chromium`.

## Manuelle Safari-Testmatrix

| Fall | Erwartung |
|---|---|
| Shortcut mit Auswahl | Popover/Drawer zeigt Artikel |
| Shortcut ohne Auswahl | Suchfeld fokussiert, keine Fehlermeldung |
| Interne Links | Navigation im Panel/Drawer |
| Externe Links | Neuer Tab, `noopener noreferrer` |
| On-Click an/aus | Indikator sichtbar; Listener entfernt bei Aus |
| Nativer PDF-Viewer | Fallback-Panel mit Hinweis + „im Viewer öffnen" |
| Eigener PDF.js-Viewer | Textauswahl + Nachschlagen |

## Reproduzierbarkeit / Hinweis zur Build-Umgebung

Die Erweiterung wurde in einer Linux-Sandbox gebaut und getestet. Der npm-Install
in Netzwerk-eingeschränkten Umgebungen kann mehrere Anläufe brauchen; `npm ci`
mit dem enthaltenen Lockfile stellt reproduzierbare Installationen sicher.

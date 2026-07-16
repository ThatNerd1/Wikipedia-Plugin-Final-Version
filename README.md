# Wikipedia Quick Search

Eine sichere, produktionsreife Browsererweiterung, die markierten Text per
Tastenkürzel direkt in einem Side Panel auf Wikipedia nachschlägt – **ohne LLM,
ohne KI, ohne Tracking, ohne eigenen Server.** Alle Inhalte kommen direkt über
die offiziellen MediaWiki-Schnittstellen von Wikipedia.

> Diese Erweiterung ist die produktionsreife Neufassung eines Google-AI-Studio-
> Prototyps. Der Prototyp war eine React-Webanwendung mit simuliertem Browser,
> Gemini-Anbindung und Express-Server. Davon wurde nichts übernommen außer
> sinnvollen Gestaltungsideen. Siehe `docs/adr/` und `ARCHITECTURE.md`.

## Funktionen

- **Markierten Text nachschlagen** – Text markieren, `Alt+W` (Windows/Linux) bzw.
  `Option+W` (macOS) drücken, das Side Panel öffnet sich mit dem passenden Artikel.
- **Echtes Side Panel** – natives `sidePanel` (Chromium/Edge), `sidebar_action`
  (Firefox) oder sicherer In-Page-Drawer (Safari/Fallback).
- **Interne Navigation mit Zurück-Button** – ohne den Tab-Verlauf zu verändern.
- **On-Click-Modus** – optional aktivierbar: angeklickte Wörter direkt nachschlagen.
- **Verlauf & gespeicherte Artikel** – vollständig lokal, mit Export/Import.
- **Mehrsprachig** – Standard: deutsche Wikipedia; umschaltbar (Allowlist).
- **Eigener PDF.js-Viewer** – für Textauswahl in PDFs.
- **Barrierefrei** – Tastaturbedienung, ARIA, Dark Mode, `prefers-reduced-motion`.

## Screenshots

_Platzhalter – die Erweiterung enthält keine gebündelten Screenshots. Zum Erzeugen:
Erweiterung laden (siehe unten), Side Panel öffnen und Screenshots ablegen unter
`docs/screenshots/`._

- `docs/screenshots/panel-empty.png` – Leerer Ausgangszustand
- `docs/screenshots/panel-article.png` – Artikelansicht mit Attribution
- `docs/screenshots/results.png` – Mehrdeutige Trefferliste
- `docs/screenshots/onclick.png` – Aktiver Klick-Modus mit Indikator

## Unterstützte Browser

| Browser | Panel-Technik | Mindestversion |
|---|---|---|
| Google Chrome | `chrome.sidePanel` | 119 |
| Microsoft Edge | `chrome.sidePanel` | 119 |
| Mozilla Firefox | `sidebar_action` | 128 (ESR) |
| Safari (macOS) | Popover/In-Page-Drawer | 17 |
| Brave/Opera/Vivaldi | `chrome.sidePanel` (Best Effort) | Chromium 119+ |

Details und Einschränkungen: `BROWSER_SUPPORT.md`.

## Systemvoraussetzungen (Entwicklung)

- Node.js ≥ 20
- npm ≥ 10
- Für den Safari-Build: macOS mit Xcode 15+ (`safari-web-extension-converter`)

## Lokale Installation (Entwicklung)

```bash
npm ci
npm run build:chromium   # oder build:firefox / build:safari
```

Die gebauten Erweiterungen liegen danach in `dist/<browser>/`.

### Sideloading in Chrome

1. `chrome://extensions` öffnen.
2. „Entwicklermodus“ oben rechts aktivieren.
3. „Entpackte Erweiterung laden“ → Ordner `dist/chromium` auswählen.

### Sideloading in Edge

1. `edge://extensions` öffnen.
2. „Entwicklermodus“ aktivieren.
3. „Entpackt laden“ → Ordner `dist/chromium` wählen (Edge nutzt den Chromium-Build).

### Sideloading in Firefox

1. `about:debugging#/runtime/this-firefox` öffnen.
2. „Temporäres Add-on laden“ → `dist/firefox/manifest.json` auswählen.
3. Für dauerhafte Installation: signiertes `.xpi` (siehe „Build & Packaging“).

### Safari-Build über Xcode

Siehe `safari/README.md`. Kurz:

```bash
npm run build:safari
xcrun safari-web-extension-converter dist/safari --project-location safari/generated --app-name "Wikipedia Quick Search" --bundle-identifier org.example.wikipediaquicksearch
```

Anschließend das erzeugte Xcode-Projekt öffnen, signieren und ausführen. In Safari
unter „Einstellungen → Erweiterungen“ aktivieren; „Entwickeln → Nicht signierte
Erweiterungen zulassen“ muss für Testbuilds aktiv sein.

## Bedienung des Shortcuts

1. Beliebigen Text auf einer Webseite markieren.
2. `Alt+W` (Windows/Linux) bzw. `Option+W` (macOS) drücken.
3. Das Side Panel öffnet sich und zeigt den passenden Wikipedia-Artikel.
   Ist die Auswahl mehrdeutig, erscheint eine Trefferliste (bis zu 8).
   Ohne Auswahl öffnet sich das Panel mit fokussiertem Suchfeld (keine Fehlermeldung).

### Ändern des Shortcuts

- **Chrome/Edge/Brave:** `chrome://extensions/shortcuts` bzw. `edge://extensions/shortcuts`.
- **Firefox:** `about:addons` → Zahnrad → „Tastenkürzel für Erweiterungen verwalten“.
- **Safari:** Safari-Einstellungen → Erweiterungen.

Falls das Kürzel bei der Installation nicht registriert werden konnte (z. B. weil
eine andere Erweiterung `Alt+W` belegt), zeigt die Erweiterung im Panel und auf der
Einstellungsseite eine verständliche Anleitung zur manuellen Belegung.

## On-Click-Berechtigungen

Der On-Click-Modus ist **standardmäßig aus**. Beim Aktivieren fragt die Erweiterung
die nötige Host-Berechtigung **zur Laufzeit** ab – wahlweise „nur auf dieser Website“
(empfohlen) oder „auf allen Websites“. Wird die Berechtigung abgelehnt, funktioniert
weiterhin alles per Tastenkürzel. Erteilte Berechtigungen lassen sich auf der
Einstellungsseite jederzeit einsehen und widerrufen.

## PDF-Einschränkungen

Content Scripts funktionieren im **eingebauten** PDF-Viewer der Browser nicht
zuverlässig. Deshalb eine ehrliche zweistufige Strategie:

1. **Nativer PDF-Fallback:** Auf einer PDF-/privilegierten Seite öffnet sich das
   Panel trotzdem, mit manuellem Suchfeld und dem Hinweis, dass die Textauswahl im
   nativen Viewer nicht zugänglich ist. Angeboten wird „PDF im Erweiterungs-Viewer öffnen“.
2. **Eigener PDF.js-Viewer:** Lokal gebündeltes PDF.js mit Textschicht, in dem
   `Alt+W`/`Option+W` und der Klick-Modus funktionieren. Remote-PDFs werden nur nach
   bewusster Bestätigung geladen, lokale PDFs nur nach expliziter Dateiauswahl.

Grenzen: `file://`-Zugriff erfordert eine gesonderte Browser-Einstellung; in Safari
ist der Konvertierungs-Workflow zu beachten. Details: `docs/adr/0005-pdf-strategy.md`.

## Buildbefehle

```bash
npm ci                    # reproduzierbare Installation aus dem Lockfile
npm run lint              # ESLint
npm run typecheck         # TypeScript (strict)
npm run test              # Unit- & Integrationstests
npm run test:security     # Security-Tests (XSS, Prototype Pollution, …)
npm run build:chromium    # Build nach dist/chromium
npm run build:firefox     # Build nach dist/firefox
npm run build:safari      # Build nach dist/safari
npm run package:chromium  # ZIP nach packages/
npm run package:firefox   # XPI nach packages/
```

## Tests

Siehe `TESTING.md`. Kurz: `npm run test:all` (Unit + Integration + Security),
`npm run test:e2e` (Playwright, Chromium), `npm run lint:webext` (Firefox).

## Datenschutz

Keine Telemetrie, kein Tracking, kein Analytics, kein eigener Server. Netzwerkzugriff
ausschließlich auf `*.wikipedia.org`. Alle Nutzerdaten (Verlauf, Lesezeichen,
Einstellungen) bleiben lokal. Vollständige Erklärung: `PRIVACY.md`.

## Lizenzen

- Quellcode dieser Erweiterung: MIT (siehe `LICENSE`).
- Wikipedia-Textinhalte: CC BY-SA 4.0 (Wikimedia). Attribution wird im Panel angezeigt.
- Abhängigkeiten: DOMPurify (Apache-2.0/MPL-2.0), PDF.js (Apache-2.0).

## Bekannte Einschränkungen

- Chromium bietet keine dokumentierte `sidePanel.close()`-API; das Panel wird über
  einen internen eingeklappten Zustand bzw. den nativen Schließen-Button geschlossen.
- Programmatisches Öffnen der Sidebar aus einem normalen Seitenklick ist nicht in
  jedem Browser erlaubt; im Klick-Modus greift dann der In-Page-Drawer.
- Der gebündelte PDF.js-Worker nutzt intern den `Function`-Konstruktor; zur Laufzeit
  ist `isEvalSupported: false` gesetzt. Details in `SECURITY.md`.
- Automatisierte Safari-Tests sind nicht enthalten (nur dokumentierte manuelle Matrix).

## Store-Publishing-Checkliste

Siehe Abschnitt am Ende von `docs/STORE_PUBLISHING.md`.

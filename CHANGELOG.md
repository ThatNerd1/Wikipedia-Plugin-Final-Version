# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [1.0.0] – 2026-07-16

### Hinzugefügt
- Erste produktionsreife Version als echte Browsererweiterung (Manifest V3).
- Kernfunktion „Markierten Text nachschlagen" via `Alt+W` / `Option+W`.
- Echtes Side Panel (Chromium `sidePanel`, Firefox `sidebar_action`) und sicherer
  In-Page-Drawer als Safari-/Fallback-Variante.
- Interne Panelnavigation mit eigenem Navigationsstack und Zurück-Button.
- On-Click-Modus mit datenschutzfreundlichem, laufzeitbasiertem Berechtigungsmodell.
- Lokaler Suchverlauf und lokale gespeicherte Artikel inkl. JSON-Export/-Import.
- Sprach-Allowlist (Standard: Deutsch) mit manueller Umschaltung.
- Eigener, lokal gebündelter PDF.js-Viewer mit Textschicht.
- Vollständige Wikipedia-Attribution (Quelle, Sprache, Lizenz, Datei-/Lizenzlink).
- Barrierefreiheit: Tastaturbedienung, ARIA, Live-Regions, Dark Mode,
  `prefers-reduced-motion`, Zoom bis 200 %.
- Sicherheit: DOMPurify-Sanitizer mit strenger Allowlist, CSP ohne `unsafe-eval`,
  validierte Runtime-Nachrichten, Prototype-Pollution-Schutz beim Import.
- Tests: 97 Unit-/Integrations-/Security-Tests, Playwright-E2E-Gerüst, `web-ext lint`.
- CI: GitHub Actions (Lint, Typecheck, Tests, Security-Tests, Builds, CodeQL,
  Dependency Review), Dependabot.

### Entfernt (gegenüber dem Prototyp)
- Gemini / `@google/genai` und `GEMINI_API_KEY`.
- Express-Server und serverseitige Bild-/Textanalyse.
- Simuliertes Browserfenster, Fake-Webseiten/PDFs (bis auf Test-Fixtures).
- Offene `postMessage("*")`-Kommunikation und Remote-Fonts.
- Hardcodierte private E-Mail-Adresse im User-Agent.

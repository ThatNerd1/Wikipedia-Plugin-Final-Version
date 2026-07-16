# Architektur

## Überblick

Gemeinsame TypeScript-Codebasis (`strict: true`), pro Zielbrowser über esbuild
gebündelt. Browserabhängigkeiten sind in einem dünnen Adapter (`src/browser/`)
mit Feature Detection isoliert.

```
Host-Webseite ──(Selektion)──▶ Content Script ──(validierte Nachricht)──▶ Background SW
                                     │                                        │
                                     ▼                                        ▼
                             In-Page-Drawer (Fallback)                 MediaWiki Action API
                                                                              │
                          Side Panel / Sidebar ◀──(PANEL_SEARCH)─────────────┘
                                     │
                                     ▼
                       Sanitizer (DOMPurify, strenge Allowlist)
```

## Kontexte

- **`src/background/`** – Service Worker (Chromium/Safari) bzw. Event Page (Firefox).
  Koordiniert Shortcut, Panel-Öffnung, On-Click-Registrierung und API-Aufrufe für den
  Drawer-Fallback. Kein DOM, kein HTML.
- **`src/content/`** – Content Script für den On-Click-Modus. Wird nur nach
  Nutzeraktivierung und erteilter Host-Berechtigung dynamisch registriert
  (`scripting.registerContentScripts`). Enthält den In-Page-Drawer im geschlossenen
  Shadow DOM.
- **`src/panel/`** – Side-Panel-UI (frameworkfrei). Rendert Suchergebnisse, Artikel,
  Verlauf, gespeicherte Artikel. Setzt sanitisiertes HTML nur über einen einzigen,
  kontrollierten Sink.
- **`src/pdf-viewer/`** – Eigener PDF.js-Viewer mit Textschicht.
- **`src/options/`** – Einstellungsseite (Sprache, Datenschutz, Berechtigungen).
- **`src/core/`** – Frameworkfreie, browserunabhängige, testbare Kernlogik:
  - `wikipedia/` – MediaWiki-Action-API-Client, Antwort-Validierung, Ergebnis-Ranking.
  - `selection/` – Textnormalisierung, Unicode-Wortsegmentierung.
  - `storage/` – Verlauf, Lesezeichen, Einstellungen, Import/Export (mit In-Memory-Fallback für Tests).
  - `navigation/` – Navigationsstack pro Panelinstanz.
  - `messaging/` – Nachrichtenschema und Laufzeitvalidierung.
  - `security/` – Sprach-Allowlist, URL-Klassifikation, HTML-Sanitizer.
- **`src/browser/`** – Adapter mit Feature Detection (`detectPanelKind`,
  `tryOpenNativePanel`, `tryCloseNativePanel`).

## Datenfluss „Markierten Text nachschlagen"

1. Nutzer drückt `Alt+W`. Der Background empfängt `commands.onCommand`.
2. Background liest die Auswahl im aktiven Tab (`activeTab` + `scripting.executeScript`,
   alle Frames) – oder, im eigenen PDF-Viewer, per Nachricht an den Viewer-Tab.
3. Auswahl wird normalisiert (`normalizeSelection`) und als „pending lookup" in
   `storage.session` abgelegt (überlebt Panel-Kaltstart, verfällt nach 30 s).
4. Natives Panel wird geöffnet (`tryOpenNativePanel`).
5. Das Panel holt beim Start den pending lookup ab bzw. empfängt `PANEL_SEARCH`.
6. Suche über die Action API; bei eindeutigem Treffer wird der Artikel geladen,
   sonst die Trefferliste gezeigt.

## Artikeldarstellung – gewählte Variante

**Bevorzugte Variante (umgesetzt):** Artikelinhalt wird über die offizielle
MediaWiki Action API geladen (`prop=extracts` für die Einleitung, `action=parse`
für den Volltext auf Wunsch) und **selbst gerendert**. Das HTML wird als vollständig
nicht vertrauenswürdig behandelt und mit DOMPurify gegen eine strenge Allowlist
sanitisiert (siehe `SECURITY.md`). Kein ungeprüftes iframe, kein RESTBase-Summary
als alleinige Grundlage. Der Sicherheitsfallback (nur Titel/Beschreibung/Einleitung/
Trefferliste mit deutlichem Link zum Volltext) greift, wenn der Volltext nicht
geladen werden kann; das Panel behauptet dann nicht, den ganzen Artikel zu zeigen.

## Warum diese Endpunkte

- `list=search` (Action API) für die Volltextsuche (stabil, dokumentiert, `origin=*`
  für CORS-freien Zugriff aus dem Browser).
- `prop=extracts|pageimages|info|pageprops|description` für Artikelmetadaten und
  Einleitung.
- `action=parse&prop=text` für gerendertes Volltext-HTML.
- Bewusst **nicht** ausschließlich RESTBase `/api/rest_v1/page/summary` (deprecation-
  gefährdet). Siehe `docs/adr/0002-mediawiki-endpoints.md`.

## Build

esbuild bündelt Background/Content als IIFE und die Seiten (Panel/Options/Viewer)
als ES-Module. Manifeste werden pro Ziel aus `manifests/` kopiert. PDF.js-Worker wird
lokal gebündelt (kein Remote Code). Produktionsbuilds ohne Source Maps.

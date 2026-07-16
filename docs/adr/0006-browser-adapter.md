# ADR 0006: Browseradapter mit Feature Detection

## Status
Angenommen.

## Kontext
Side-Panel-APIs unterscheiden sich (Chromium `sidePanel`, Firefox `sidebarAction`,
Safari kein natives Panel). Programmatisches Öffnen/Schließen ist browserabhängig.

## Entscheidung
Ein Adapter (`src/browser/adapter.ts`) kapselt `detectPanelKind`, `tryOpenNativePanel`,
`tryCloseNativePanel` über **Feature Detection** (nicht User-Agent). Ohne natives Panel
oder wenn Öffnen nicht erlaubt ist, greift ein sicherer In-Page-Drawer (geschlossenes
Shadow DOM). `sidePanel.close()` existiert in Chromium nicht → interner Collapse-Zustand.

## Konsequenzen
Eine Codebasis, ehrlich dokumentierte Browserunterschiede (`BROWSER_SUPPORT.md`).

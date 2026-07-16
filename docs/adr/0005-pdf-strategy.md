# ADR 0005: Ehrliche zweistufige PDF-Strategie

## Status
Angenommen.

## Kontext
Content Scripts funktionieren im eingebauten PDF-Viewer der Browser nicht zuverlässig.

## Entscheidung
Stufe 1 (nativer Fallback): Auf PDF-/privilegierten Seiten öffnet sich das Panel mit
manuellem Suchfeld und ehrlichem Hinweis; Angebot „PDF im Erweiterungs-Viewer öffnen".
Keine pauschale Clipboard-Berechtigung.
Stufe 2 (eigener PDF.js-Viewer): lokal gebündelt, mit Textschicht, `Alt+W`/Klick-Modus,
`enableScripting:false`, `isEvalSupported:false`. Remote-PDFs nur nach Bestätigung,
lokale nur nach Dateiauswahl; Original-URL sichtbar.

## Konsequenzen
Keine falschen Kompatibilitätsversprechen. `file://` und Safari haben dokumentierte
Grenzen.

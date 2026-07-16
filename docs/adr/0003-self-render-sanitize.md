# ADR 0003: Selbst-Rendering mit Sanitizer statt iframe

## Status
Angenommen.

## Kontext
Wikipedia in einem ungeprüften iframe darzustellen ist unsicher und unflexibel.

## Entscheidung
Artikelinhalt wird über die Action API geladen und **selbst gerendert**. HTML gilt
als vollständig nicht vertrauenswürdig und wird mit **DOMPurify** gegen eine strenge
Allowlist bereinigt: keine Scripts/Styles/Formulare/iframes/Objekte/SVG/MathML/
Event-Handler; Links werden klassifiziert und umgeschrieben; Bilder nur von
`upload.wikimedia.org`. Einziger `innerHTML`-Sink; Trusted Types, wo verfügbar.
Sicherheitsfallback: nur Titel/Beschreibung/Einleitung/Trefferliste + Volltext-Link,
ohne zu behaupten, der ganze Artikel werde gezeigt.

## Konsequenzen
Kontrollierte, sichere Darstellung. Etwas mehr Rendering-Code, dafür kein iframe-Risiko.

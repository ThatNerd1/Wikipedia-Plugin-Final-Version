# ADR 0001: Echte Browsererweiterung ohne LLM

## Status
Angenommen.

## Kontext
Der Ausgangsprototyp war eine React-Webanwendung mit simuliertem Browser, Gemini-
Anbindung und Express-Server. Anforderung: echte, LLM-freie Erweiterung.

## Entscheidung
Neuaufbau als Manifest-V3-Erweiterung mit gemeinsamer TypeScript-Codebasis. Entfernung
von Gemini/`@google/genai`, `GEMINI_API_KEY`, Bild-/Kameraanalyse, LLM-Kindererklärungen,
Express-Server und simuliertem Browserfenster. Übernommen werden nur Gestaltungsideen
(Panel-Layout, Farbhierarchie).

## Konsequenzen
Keine generative KI, kein Backend, kein serverseitiges Fetching. Alle Inhalte über
offizielle MediaWiki-APIs. Deutlich kleinere Angriffsfläche und Abhängigkeitsliste.

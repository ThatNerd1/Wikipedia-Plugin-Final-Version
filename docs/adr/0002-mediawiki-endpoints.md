# ADR 0002: MediaWiki-Endpunkte

## Status
Angenommen.

## Kontext
Für Suche und Artikelinhalte gibt es die Action API, die REST-API und das (deprecation-
gefährdete) RESTBase `/api/rest_v1/page/summary`.

## Entscheidung
Primär die **MediaWiki Action API** (`api.php`) mit `origin=*` für CORS-freien
Browserzugriff:
- `list=search` (`srnamespace=0`, `srlimit=8`) für die Suche.
- `prop=extracts|pageimages|info|pageprops|description` für Metadaten + Einleitung.
- `action=parse&prop=text` für gerendertes Volltext-HTML (auf Wunsch, sanitisiert).
RESTBase-Summary wird bewusst **nicht** als alleinige Grundlage genutzt.

## Konsequenzen
Stabile, dokumentierte Endpunkte. Volltext-HTML ist nicht vertrauenswürdig und wird
strikt sanitisiert (ADR 0003).

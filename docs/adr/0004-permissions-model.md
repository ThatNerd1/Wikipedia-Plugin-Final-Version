# ADR 0004: Minimales, laufzeitbasiertes Berechtigungsmodell

## Status
Angenommen.

## Kontext
Der Shortcut-Modus braucht nur die aktive Seite; der On-Click-Modus braucht
dauerhaften Seitenzugriff.

## Entscheidung
Basisrechte: `activeTab`, `scripting`, `storage`, Panel-/Sidebar-Recht, Host
`https://*.wikipedia.org/*`. Kein `<all_urls>` als Standard. Der On-Click-Modus ist
aus; beim Aktivieren wird die Host-Berechtigung **zur Laufzeit** angefragt (bevorzugt
seitenspezifisch), das Content Script dynamisch registriert und alles jederzeit
widerrufbar. Kein `history`/`bookmarks`/`cookies`/`clipboard`/`webRequest`.

## Konsequenzen
Datenschutzfreundlich, store-konform. Programmatisches Panel-Öffnen aus Seitenklicks
ist eingeschränkt → Drawer-Fallback (ADR 0006).

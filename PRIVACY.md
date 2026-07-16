# Datenschutz

**Kurzfassung: Diese Erweiterung sammelt nichts, sendet nichts an Dritte und
betreibt keinen eigenen Server.**

## Welche Daten verarbeitet werden

- **Suchbegriffe** werden zur Laufzeit an die Wikipedia-API gesendet, um Artikel zu
  finden – genau wie eine Suche auf wikipedia.org. Es wird keine Kennung übertragen,
  die dich identifiziert.
- **Verlauf** (optional, standardmäßig aktiv): bis zu 100 Sucheinträge, ausschließlich
  in `storage.local` auf deinem Gerät. Abschaltbar und jederzeit löschbar.
- **Gespeicherte Artikel**: Titel, Sprache, kanonische URL, kurze Beschreibung,
  Thumbnail-URL, Speicherzeitpunkt – lokal.
- **Einstellungen**: Sprache, Theme, Schalter – lokal (optional über `storage.sync`).

## Was NICHT passiert

- Keine Telemetrie, kein Analytics, kein Tracking, keine Werbe-IDs.
- Kein eigener Backend-/Proxy-Server.
- Keine Übertragung an andere Ziele als `*.wikipedia.org`.
- Keine Speicherung vollständiger Webseiteninhalte.
- Keine Speicherung von Textauswahlen außerhalb der Verlaufsfunktion.
- Keine Nutzung der Browser-Berechtigungen `history`, `bookmarks`, `cookies`,
  `clipboardRead` oder `webRequest`.

## Netzwerkverbindungen

Ausschließlich zu `https://*.wikipedia.org` (per CSP `connect-src` erzwungen) sowie
Bildabrufe von `https://upload.wikimedia.org`. Wikipedia/Wikimedia sieht dabei –
wie bei jeder normalen Nutzung – IP-Adresse und User-Agent; die Erweiterung
identifiziert sich gemäß Wikimedia-Policy über den `Api-User-Agent`-Header
(ohne personenbezogene Daten, ohne private E-Mail-Adresse).

## Incognito / Privater Modus

Im Inkognito-/privaten Modus werden **keine** Verlaufseinträge gespeichert.
Die Erweiterung ist standardmäßig nicht für den Inkognito-Modus zugelassen
(`incognito: not_allowed`); der Nutzer müsste dies bewusst erlauben.

## Datenkontrolle

Auf der Einstellungsseite: Verlauf deaktivieren/löschen, gespeicherte Artikel
exportieren/importieren/löschen, Website-Berechtigungen widerrufen und
**„Alle lokalen Daten löschen"**.

## Wikipedia-Attribution & Lizenzen

Angezeigte Inhalte stammen von Wikipedia (Texte: CC BY-SA 4.0). Im Panel werden
Quelle, Sprachversion, Lizenzhinweis, Link zum Originalartikel und – bei Bildern –
ein Link zur Dateibeschreibungsseite angezeigt.

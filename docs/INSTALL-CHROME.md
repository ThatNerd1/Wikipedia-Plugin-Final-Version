# Wikipedia Quick Search in Chrome installieren – Schritt für Schritt

Diese Anleitung richtet sich an Einsteiger und erklärt jeden Schritt. Chrome ist
deutlich einfacher als Safari – plane nur **etwa 5 Minuten** ein.

> Diese Anleitung gilt genauso für **Microsoft Edge**, **Brave**, **Opera** und
> **Vivaldi**. Nur die Adresse der Erweiterungsseite unterscheidet sich – die
> steht jeweils in Klammern dabei.

---

## Es gibt zwei Wege

- **Weg A – Fertiger Ordner (am einfachsten):** Du hast bereits einen fertigen
  `dist/chromium`-Ordner (oder eine ZIP-Datei davon). Dann brauchst du **kein**
  Node.js und kannst direkt bei **Schritt 2** starten.
- **Weg B – Selbst bauen:** Du hast nur den Projektordner mit dem Quellcode.
  Dann führe zuerst **Schritt 1** aus.

---

## Schritt 1 (nur Weg B): Die Erweiterung bauen

Dafür wird **Node.js** benötigt (einmalig von https://nodejs.org, Version „LTS",
per Doppelklick installieren).

1. Öffne die **Eingabeaufforderung**: `Windows-Taste` drücken, `cmd` tippen,
   `Enter`. (Auf dem Mac: „Terminal" über `Cmd (⌘)` + `Leertaste`.)
2. Wechsle in den Projektordner. Tippe `cd ` (mit Leerzeichen), ziehe den
   Projektordner ins Fenster und drücke `Enter`.
3. Tippe nacheinander (jeweils `Enter`, warten bis fertig):

   ```
   npm ci
   ```

   ```
   npm run build:chromium
   ```

Danach gibt es einen Unterordner **`dist\chromium`** – das ist die fertige
Erweiterung. Merke dir, wo er liegt.

> **Fehler „command not found: npm" / „npm wird nicht erkannt"?** Dann fehlt
> Node.js. Nach der Installation das Fenster schließen, neu öffnen und
> Schritt 1 wiederholen.

## Schritt 2: Die Erweiterungsseite öffnen

1. Öffne **Google Chrome**.
2. Tippe oben in die Adresszeile genau das hier und drücke `Enter`:

   ```
   chrome://extensions
   ```

   *(Edge: `edge://extensions` · Brave: `brave://extensions` ·
   Opera: `opera://extensions` · Vivaldi: `vivaldi://extensions`)*

## Schritt 3: Entwicklermodus einschalten

Oben rechts auf der Seite gibt es einen Schalter **„Entwicklermodus"**
(englisch „Developer mode"). Schalte ihn **ein**. Jetzt erscheinen neue Knöpfe.

## Schritt 4: Die Erweiterung laden

- Falls du eine **ZIP-Datei** hast: entpacke sie zuerst (Rechtsklick →
  „Alle extrahieren"), sodass ein Ordner mit einer Datei `manifest.json` darin
  entsteht.
- Klicke auf **„Entpackte Erweiterung laden"** (englisch „Load unpacked").
- Wähle den Ordner **`dist\chromium`** (bzw. deinen entpackten Ordner) aus und
  bestätige.

Die Kachel „Wikipedia Quick Search" erscheint jetzt in der Liste. Achte darauf,
dass der Schalter auf der Kachel **eingeschaltet** (blau) ist.

## Schritt 5: Das Symbol anheften (empfohlen)

1. Klicke oben rechts in der Symbolleiste auf das **Puzzleteil-Symbol**.
2. Bei „Wikipedia Quick Search" auf die **Pinnnadel** klicken.

So hast du das Erweiterungs-Symbol immer sichtbar. Ein Klick darauf öffnet
jederzeit das Panel.

## Schritt 6: Das Tastenkürzel prüfen

Chrome und Edge weisen das Kürzel manchmal nicht automatisch zu.

1. Adresszeile: `chrome://extensions/shortcuts` (Edge:
   `edge://extensions/shortcuts`) eingeben und `Enter`.
2. Bei **„Look up selected text on Wikipedia"** ins Feld klicken und
   **`Alt` + `W`** drücken (Mac: `Option (⌥)` + `W`).
3. Den zweiten Slot **„Activate the extension"** kannst du **leer lassen** –
   `Alt+W` allein genügt.

## Schritt 7: Ausprobieren

1. Öffne eine beliebige Webseite mit Text.
2. Markiere ein Wort.
3. Drücke **`Alt` + `W`** (Mac: `Option (⌥)` + `W`) – das Panel mit dem
   Wikipedia-Artikel öffnet sich rechts.
   - Alternativ: **Rechtsklick** auf das markierte Wort →
     **„Auf Wikipedia nachschlagen"**.
   - Oder einfach auf das **angeheftete Symbol** klicken und oben ins Suchfeld
     tippen.

Fertig! 🎉

---

## Häufige Probleme

**`Alt+W` reagiert nicht.**
Meist ist das Kürzel nicht zugewiesen – hol Schritt 6 nach. Oder eine andere
Erweiterung belegt `Alt+W`; dann dort ein anderes Kürzel wählen. Der
Rechtsklick-Weg und der Symbol-Klick funktionieren auch ohne Kürzel.

**Nach dem Schließen von Chrome ist die Erweiterung weg / zeigt einen Fehler.**
Entpackte Erweiterungen bleiben installiert, solange der `dist\chromium`-Ordner
an seinem Platz liegt. Verschiebe oder lösche ihn nicht. Nach einem Update der
Dateien auf `chrome://extensions` bei der Kachel auf **„Aktualisieren"/Reload**
(das runde Pfeil-Symbol) klicken.

**„manifest.json" nicht gefunden beim Laden.**
Du hast vermutlich den falschen Ordner gewählt. Wähle den Ordner, der die Datei
`manifest.json` **direkt** enthält (bei ZIP: den entpackten Inhalt, nicht den
ZIP-übergeordneten Ordner).

**Auf `chrome://`-Seiten oder in PDF-Ansichten passiert nichts.**
Das ist beabsichtigt: Auf internen Browserseiten und im eingebauten PDF-Viewer
ist die Textauswahl für Erweiterungen gesperrt. Nutze dort das Suchfeld im Panel
oder den eigenen PDF-Betrachter der Erweiterung.

---

## Gut zu wissen

- Es werden keine Daten gesammelt oder an Server gesendet; die Erweiterung
  spricht ausschließlich mit Wikipedia. Details in `PRIVACY.md`.
- Es gibt drei bequeme Wege zum Nachschlagen: Tastenkürzel `Alt+W`,
  Rechtsklick-Menü und Klick auf das Symbol.

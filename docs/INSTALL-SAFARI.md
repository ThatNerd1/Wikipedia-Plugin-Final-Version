# Wikipedia Quick Search in Safari installieren – Schritt für Schritt

Diese Anleitung richtet sich an Einsteiger. Sie erklärt jeden Schritt und setzt
kein Vorwissen voraus. Plane etwa **20–30 Minuten** ein, das meiste davon ist
Wartezeit beim Herunterladen.

> **Warum ist Safari komplizierter als Chrome oder Firefox?**
> Bei Chrome, Edge und Firefox kann man einen Ordner einfach „laden". Safari
> erlaubt das aus Sicherheitsgründen nicht: Jede Safari-Erweiterung muss von
> Apples Programm **Xcode** in eine kleine App verpackt werden. Klingt technisch,
> ist aber mit dieser Anleitung gut machbar – du musst nichts programmieren.

---

## Was du vorher brauchst

1. **Einen Mac** mit macOS 14 (Sonoma) oder neuer.
2. **Xcode** – Apples kostenloses Entwickler-Programm.
   - Öffne den **App Store**, suche nach „Xcode", klicke **Laden**.
   - Xcode ist groß (mehrere Gigabyte); der Download dauert je nach Internet
     eine Weile. Das ist normal.
3. **Node.js** – ein Hilfsprogramm, mit dem die Erweiterung gebaut wird.
   - Gehe auf https://nodejs.org, lade die Version mit der Bezeichnung **„LTS"**
     herunter und installiere sie per Doppelklick (immer „Weiter" klicken).
4. **Den Projektordner** der Erweiterung (`Wikipedia-Plugin-Final-Version`) –
   z. B. entpackt aus der ZIP-Datei oder von GitHub heruntergeladen.

> **Tipp:** Wenn du nicht weißt, ob Node schon installiert ist, überspring
> Punkt 3 erst einmal – Schritt 3 der Anleitung zeigt dir, wie du es prüfst.

---

## Schritt 1: Das Terminal öffnen

Das „Terminal" ist ein Fenster, in das man Befehle tippt.

1. Drücke `Cmd (⌘)` + `Leertaste`. Ein Suchfeld erscheint.
2. Tippe **Terminal** und drücke `Enter`.
3. Ein Fenster mit Text öffnet sich. Das ist richtig so.

## Schritt 2: In den Projektordner wechseln

Tippe im Terminal `cd ` (mit einem Leerzeichen dahinter), **ziehe dann den
Projektordner** aus dem Finder in das Terminal-Fenster und drücke `Enter`.
Der Befehl sieht dann etwa so aus:

```
cd /Users/deinname/Downloads/Wikipedia-Plugin-Final-Version
```

## Schritt 3: Die Erweiterung bauen

Tippe nacheinander diese zwei Befehle, jeweils gefolgt von `Enter`. Warte, bis
der erste fertig ist, bevor du den zweiten eingibst.

```
npm ci
```

```
npm run build:safari
```

- Beim ersten Befehl werden Hilfsdateien geladen (dauert ein bis zwei Minuten).
- Nach dem zweiten Befehl steht am Ende sinngemäß „Build fertig: dist/safari".

> **Fehlermeldung „command not found: npm"?** Dann ist Node.js noch nicht
> installiert – hol das über https://nodejs.org (LTS) nach, schließe das
> Terminal, öffne es neu und beginne wieder bei Schritt 2.

## Schritt 4: In ein Safari-/Xcode-Projekt umwandeln

Kopiere diesen Befehl komplett ins Terminal und drücke `Enter`:

```
xcrun safari-web-extension-converter dist/safari --project-location safari/generated --macos-only
```

Das erzeugt ein kleines Xcode-Projekt im Ordner `safari/generated`. Wenn
gefragt wird, ob Xcode geöffnet werden soll, bestätige mit **Yes** bzw. `Enter`.

## Schritt 5: Die App in Xcode starten

1. Xcode öffnet sich (falls nicht: Ordner `safari/generated` öffnen und die
   Datei mit der Endung **.xcodeproj** doppelklicken).
2. Oben links im Xcode-Fenster ist ein **▶ (Play)-Knopf**. Klicke ihn.
3. Beim ersten Mal fragt Xcode nach einem „Team":
   - Klicke auf den Projektnamen ganz oben links in der Seitenleiste.
   - Wähle den Reiter **Signing & Capabilities**.
   - Bei **Team** wähle deine **Apple-ID** aus (oder klicke „Add an Account"
     und melde dich mit deiner normalen Apple-ID an – das ist kostenlos).
   - Danach nochmal den **▶-Knopf** drücken.
4. Eine kleine App „Wikipedia Quick Search" startet. Du kannst dieses
   App-Fenster einfach schließen – die Erweiterung ist damit bei Safari
   registriert.

## Schritt 6: Die Erweiterung in Safari aktivieren

1. Öffne **Safari**.
2. Menüleiste oben: **Safari → Einstellungen** (oder `Cmd (⌘)` + `,`).
3. Falls es den Reiter **Erweiterungen** noch nicht gibt oder die Erweiterung
   ausgegraut ist, brauchst du einmalig das Entwickler-Menü:
   - Reiter **Erweitert** öffnen, ganz unten Haken bei
     **„Funktionen für Web-Entwickler anzeigen"** (bzw. „Entwickeln-Menü
     anzeigen") setzen.
   - In der Menüleiste erscheint jetzt **Entwickeln**. Dort
     **„Unsignierte Erweiterungen zulassen"** anklicken.
4. Zurück in **Einstellungen → Erweiterungen**: Setze den Haken bei
   **Wikipedia Quick Search**.
5. Safari fragt nach Berechtigungen für Websites. Wähle **Erlauben** (bei
   Nachfrage „für alle Websites" oder „für einen Tag" – beides ist in Ordnung).

## Schritt 7: Ausprobieren

1. Öffne eine beliebige Webseite mit Text (z. B. eine Nachrichtenseite).
2. Markiere ein Wort.
3. Drücke **`Option (⌥)` + `W`** – das Panel mit dem Wikipedia-Artikel erscheint.
   - Alternativ: **Rechtsklick** auf das markierte Wort →
     **„Auf Wikipedia nachschlagen"**.

Fertig! 🎉

---

## Häufige Probleme

**„Unsignierte Erweiterungen zulassen" ist nach Neustart wieder weg.**
Das ist von Apple so gewollt: Die Einstellung gilt nur bis zum nächsten
Safari-Neustart. Danach das Häkchen unter **Entwickeln** einfach erneut setzen.
(Dauerhaft ohne diesen Schritt geht es nur, wenn die App über den Mac App Store
signiert veröffentlicht wird.)

**`Option+W` reagiert nicht.**
Prüfe, ob die Erweiterung in **Einstellungen → Erweiterungen** aktiviert ist und
ob du Website-Berechtigungen erteilt hast. Der Rechtsklick-Weg funktioniert auch
ohne Tastenkürzel.

**Xcode zeigt einen roten Fehler beim ▶-Knopf.**
Fast immer fehlt das **Team** unter *Signing & Capabilities* (Schritt 5.3).
Apple-ID auswählen und erneut starten.

**„xcrun: command not found".**
Dann ist Xcode noch nicht vollständig installiert. Öffne Xcode einmal normal,
akzeptiere die Lizenz, lass es die Zusatzkomponenten laden, und versuche
Schritt 4 erneut.

---

## Ehrliche Einschränkungen unter Safari

- Ohne kostenpflichtiges Apple-Entwicklerprogramm bzw. App-Store-Veröffentlichung
  muss „Unsignierte Erweiterungen zulassen" nach jedem Safari-Neustart neu
  gesetzt werden. Für den Eigengebrauch ist das kein Problem.
- Safari hat keine seitliche Panel-Technik wie Chrome. Die Erweiterung nutzt
  stattdessen ein kleines Fenster über dem Toolbar-Symbol bzw. einen
  eingeblendeten Bereich auf der Seite.
- PDFs im eingebauten Vorschau-Viewer erlauben keine Erweiterungs-Textauswahl;
  dafür gibt es den eigenen PDF-Betrachter der Erweiterung.

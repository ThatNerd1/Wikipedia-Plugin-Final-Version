# Sicherheit

## Grundprinzipien

- **Manifest V3**, minimale Berechtigungen, keine pauschalen Rechte.
- **Keine Remote-Ressourcen:** kein Remote-JavaScript, keine CDNs, keine Google Fonts.
  Ausschließlich System-/lokale Fonts.
- **Kein `eval`, kein `Function`, kein dynamisches Code-Laden** im eigenen Code
  (per ESLint-Regeln `no-eval`, `no-implied-eval`, `no-new-func` erzwungen).
- **Keine Telemetrie, kein Backend.** Netzwerkzugriff nur zu `*.wikipedia.org`.

## Content Security Policy (Extension-Seiten)

```
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' https://upload.wikimedia.org;
connect-src 'self' https://*.wikipedia.org;
object-src 'none';
base-uri 'none';
form-action 'none';
frame-ancestors 'none'
```

Kein `unsafe-eval`, keine Inline-Scripts, keine Inline-Event-Handler.

## Umgang mit nicht vertrauenswürdigen Inhalten

- **Textauswahl** wird nie als HTML interpretiert, sondern normalisiert
  (NFC, Whitespace-Kollaps, Entfernen unsichtbarer Zeichen, max. 300 Zeichen).
- **MediaWiki-HTML** wird mit DOMPurify gegen eine strenge Allowlist sanitisiert:
  Scripts, Styles, Formulare, iframes, Objekte, SVG/MathML, Event-Handler und
  gefährliche URL-Schemata werden entfernt. Jeder `<a href>` wird über
  `classifyWikiHref` klassifiziert und auf die interne Panelnavigation umgeschrieben;
  externe Links nur als `https:` mit `rel="noopener noreferrer" target="_blank"`.
  Bilder nur von `upload.wikimedia.org`, mit Lazy Loading und `no-referrer`.
- **Einziger innerHTML-Sink:** `setSanitizedHtml()`. Es gibt keine anderen
  ungeprüften `innerHTML`-Zuweisungen. Wo der Browser Trusted Types unterstützt,
  wird eine dedizierte Policy (`wqs-sanitized`) verwendet.
- **JSON-Import** ist gegen Prototype Pollution (Reviver + Schemavalidierung),
  übergroße Dateien (1 MB) und ungültige Schemas abgesichert.

## Messaging

- Explizit definierte Nachrichtentypen (`src/core/messaging/schema.ts`).
- Jede eingehende Nachricht wird zur Laufzeit gegen das Schema validiert.
- Absenderprüfung: nur Nachrichten aus der eigenen Erweiterung
  (`sender.id === runtime.id`) werden akzeptiert.
- Keine offenen `window.postMessage(..., "*")`-Kanäle.

## Berechtigungen

Basisrechte: `activeTab`, `scripting`, `storage`, Panel-/Sidebar-Recht,
Host-Recht `https://*.wikipedia.org/*`. Host-Recht für den On-Click-Modus ist
**optional** und wird zur Laufzeit angefragt (bevorzugt seitenspezifisch),
jederzeit widerrufbar. `incognito: not_allowed`.

## Supply Chain

- Nur zwei Produktionsabhängigkeiten: **DOMPurify** und **pdfjs-dist**.
- Reproduzierbare Installation über `package-lock.json` (`npm ci`).
- `npm audit --omit=dev`: 0 Schwachstellen (Stand des letzten Builds).
- CI: CodeQL, Dependency Review, `web-ext lint`, Dependabot (`.github/dependabot.yml`).
- Keine Postinstall-Scripts im eigenen Paket.

## Bekannte, bewusst akzeptierte Punkte

- Der Drittanbieter-Worker `pdf.worker.min.mjs` enthält statisch einen
  `Function`-Konstruktor. `web-ext lint` meldet dies als Warnung (kein Fehler).
  Zur Laufzeit setzen wir `isEvalSupported: false` und `enableScripting: false`,
  wodurch PDF.js den eval-Pfad meidet. Der Worker läuft in seinem eigenen
  Worker-Kontext.

## Meldung von Schwachstellen

Bitte Sicherheitslücken nicht über öffentliche Issues melden, sondern über den in
`CONTRIBUTING.md` genannten Weg (Security Advisory / private Meldung).

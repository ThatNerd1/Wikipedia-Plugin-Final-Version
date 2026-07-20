# Store-Publishing-Checkliste

## Allgemein
- [ ] Version in `package.json` und allen `manifests/*.json` synchron.
- [ ] `npm ci && npm run typecheck && npm run lint && npm run test:all` grün.
- [ ] Produktionsbuild ohne Source Maps, ohne Secrets, ohne Demo-Daten.
- [ ] `PRIVACY.md`, `SECURITY.md` aktuell; Datenschutzangaben im Store konsistent.
- [ ] Icons in allen Größen vorhanden (16/32/48/128).
- [ ] Screenshots erstellt und in `docs/screenshots/` abgelegt.

## Chrome Web Store
- [ ] `npm run package:chromium` → `packages/…-chromium-v<version>.zip`.
- [ ] Berechtigungsbegründungen hinterlegt (`activeTab`, `scripting`, `storage`, `contextMenus`,
      `sidePanel`, Host `*.wikipedia.org`, optional `<all_urls>` für On-Click).
- [ ] Datenschutz-Formular ausgefüllt (keine Datensammlung).
- [ ] Single-Purpose-Beschreibung.

## Microsoft Edge Add-ons
- [ ] Chromium-ZIP hochladen.
- [ ] Store-Listing + Datenschutz analog Chrome.

## Firefox (AMO)
- [ ] `npm run package:firefox` → `.xpi`.
- [ ] `web-ext lint` ohne Fehler (Warnungen des PDF.js-Workers dokumentiert).
- [ ] Signieren via `web-ext sign` (API-Keys als CI-Secrets, nicht im Repo).
- [ ] Quellcode-Einreichung vorbereiten (esbuild-Buildschritte dokumentiert).

## Safari (App Store / Notarisierung)
- [ ] `npm run build:safari` und `safari-web-extension-converter` (siehe `safari/README.md`).
- [ ] Xcode-Projekt signieren, App notarisieren.
- [ ] App-Store-Metadaten und Datenschutzlabels ausfüllen.

## Sicherheit / Compliance
- [ ] `npm audit --omit=dev` ohne kritische Findings.
- [ ] Keine Secrets im Repository; CI-Secrets rotiert.
- [ ] CHANGELOG aktualisiert.

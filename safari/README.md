# Safari-Build

Safari benötigt einen Xcode-Wrapper um die Web-Extension. Der Ablauf ist
reproduzierbar dokumentiert (nur auf macOS mit Xcode ausführbar).

## Voraussetzungen
- macOS 14+, Xcode 15+
- `xcrun safari-web-extension-converter` (Teil von Xcode)

## Schritte

```bash
# 1) Web-Extension bauen
npm ci
npm run build:safari         # erzeugt dist/safari

# 2) In ein Xcode-Projekt konvertieren
xcrun safari-web-extension-converter dist/safari \
  --project-location safari/generated \
  --app-name "Wikipedia Quick Search" \
  --bundle-identifier org.example.wikipediaquicksearch \
  --swift --macos-only

# 3) Öffnen, signieren, starten
open safari/generated/"Wikipedia Quick Search"/"Wikipedia Quick Search".xcodeproj
```

In Xcode ein Signing-Team wählen und das macOS-Target starten. In Safari unter
„Einstellungen → Erweiterungen" aktivieren. Für unsignierte Testbuilds:
„Entwickeln → Nicht signierte Erweiterungen zulassen".

## Einschränkungen (ehrlich)
- Programmatisches Öffnen einer nativen Sidebar gibt es in Safari nicht; die
  Erweiterung nutzt ein Toolbar-Popover und den In-Page-Drawer.
- `file://`-PDFs erfordern zusätzliche Nutzerfreigaben.
- Automatisierte Safari-Extension-Tests sind hier nicht enthalten; es gilt die
  manuelle Testmatrix in `TESTING.md`.
- Das generierte Xcode-Projekt wird nicht eingecheckt (siehe `.gitignore`), da es
  maschinen-/teamspezifische Signierdaten enthält.

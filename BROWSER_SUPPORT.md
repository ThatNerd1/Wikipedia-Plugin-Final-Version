# Browser-Unterstützung

Gemeinsame TypeScript-Codebasis; browserabhängiges Verhalten liegt in
`src/browser/adapter.ts` und den Manifestvarianten. Feature Detection statt
reiner User-Agent-Erkennung.

## Matrix

| Browser | Panel | Öffnen per Shortcut | Öffnen per Klick (On-Click) | Programm. Schließen | Mindestversion |
|---|---|---|---|---|---|
| Chrome | `chrome.sidePanel` | ✅ (User-Gesture) | Panel-Update, sonst Drawer | ❌ (kein API) → Drawer/nativer Button | 119 |
| Edge | `chrome.sidePanel` | ✅ | wie Chrome | ❌ → Drawer/nativer Button | 119 |
| Firefox | `sidebar_action` | ✅ (`_execute_sidebar_action` / Klick) | Drawer, wenn Öffnen nicht erlaubt | ✅ `sidebarAction.close()` | 128 |
| Safari | Popover + In-Page-Drawer | Popover via Toolbar; Drawer im Content | In-Page-Drawer | Popover schließt sich selbst | 17 |
| Brave/Opera/Vivaldi | `chrome.sidePanel` (Best Effort) | ✅ | wie Chrome | ❌ → Drawer | Chromium 119+ |

## Warum diese Mindestversionen

- **Chromium 119:** `chrome.sidePanel.open()` (programmatisches Öffnen) ist ab
  Chrome 116 verfügbar; 119 als konservative, breit verfügbare Basis inkl. Edge.
- **Firefox 128 (ESR):** stabile MV3-Unterstützung inkl. `scripting.registerContentScripts`
  und `sidebar_action` unter MV3.
- **Safari 17:** MV3 Web Extensions mit `scripting` und Popover-UI.

Es werden jeweils die aktuelle stabile Version und möglichst die letzten zwei
Hauptversionen unterstützt.

## Browserabhängiges Verhalten im Detail

### Chromium & Edge
- Natives `sidePanel`. Öffnen nach zulässiger Nutzerinteraktion (Shortcut/Icon-Klick).
- Kein dokumentiertes `sidePanel.close()`: Schließen über internen eingeklappten
  Zustand plus Erklärung des nativen Schließen-Buttons.
- Aus einem normalen Seitenklick lässt sich das Panel nicht immer programmatisch
  öffnen → im Klick-Modus greift dann der In-Page-Drawer; ein bereits offenes Panel
  wird stattdessen aktualisiert.

### Firefox
- `sidebar_action` + `browser.sidebarAction`. `open()/close()/toggle()` nur, wo die
  Nutzerinteraktion es erlaubt. Zusätzliches Kürzel `Alt+Shift+W` zum Umschalten.

### Safari / Browser ohne native Sidebar-API
- Sicherer In-Page-Drawer im **geschlossenen Shadow DOM**, verschiebbar und
  einklappbar, blockiert keine Seiteninhalte dauerhaft. Vermeidet Konflikte mit CSS/JS
  der Hostseite. Zusätzlich Popover-UI über das Toolbar-Icon.

## Ehrliche Einschränkungen

- Programmatisches Panel-Öffnen aus Seitenklicks ist browserabhängig eingeschränkt.
- `sidePanel.close()` existiert in Chromium nicht als stabile API.
- Safari-Verhalten wurde nicht in dieser Umgebung automatisiert getestet
  (siehe `TESTING.md`, manuelle Matrix).

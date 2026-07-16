import { defineConfig } from '@playwright/test';

// Chromium-Extension-Tests: laden die gebaute Erweiterung ungepackt.
// Voraussetzung: `npm run build:chromium` und lokal installierte Playwright-Browser.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { headless: false },
  reporter: [['list']]
});

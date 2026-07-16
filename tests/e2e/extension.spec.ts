import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Chromium-Extension-E2E. Voraussetzung: `npm run build:chromium` wurde ausgeführt
 * und Playwright-Browser sind lokal installiert (`npx playwright install chromium`).
 * Diese Tests laden die entpackte Erweiterung aus dist/chromium.
 */
const dir = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(dir, '../../dist/chromium');

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
  });
});

test.afterAll(async () => { await context?.close(); });

test('Erweiterung lädt Background Service Worker', async () => {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  expect(worker.url()).toContain('background.js');
});

test('Panel-Dokument rendert den leeren Ausgangszustand', async () => {
  const [background] = context.serviceWorkers();
  const extId = background.url().split('/')[2];
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/panel/index.html`);
  await expect(page.locator('#wqs-heading')).toContainText('Wikipedia');
  await expect(page.locator('#wqs-search')).toBeVisible();
  await page.close();
});

// Weitere geplante Flows (Shortcut mit/ohne Auswahl, Zurücknavigation,
// Suchtrefferauswahl, interne Links, On-Click an/aus, History löschen,
// Artikel speichern/entfernen, API-Ausfall/Offline, PDF-Fallback) sind in
// TESTING.md gelistet und werden über gemockte Netzwerk-Routen umgesetzt.

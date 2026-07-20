/**
 * Background Service Worker (Chromium/Safari) bzw. Event Page (Firefox).
 * Klein, frameworkfrei, ausschließlich Koordination – kein DOM, kein HTML.
 */
import { tryOpenNativePanel, configureActionClickOpensPanel, detectPanelKind } from '../browser/adapter.js';
import {
  DrawerLookupResponse, ExtensionMessage, MSG, SearchReason,
  isTrustedSender, validateMessage
} from '../core/messaging/schema.js';
import { normalizeSelection } from '../core/selection/normalize.js';
import { coerceLanguage } from '../core/security/languages.js';
import { addHistoryEntry } from '../core/storage/history.js';
import { getSettings, updateSettings } from '../core/storage/settings.js';
import { sessionArea } from '../core/storage/area.js';
import { getArticleSummaryRaw, searchArticles, stripSnippetHtml } from '../core/wikipedia/api.js';
import { WikipediaApiError } from '../core/wikipedia/types.js';

const PENDING_KEY = 'wqs.pendingLookup';
const SHORTCUT_STATE_KEY = 'wqs.shortcutRegistered';
const ONCLICK_SCRIPT_ID = 'wqs-onclick';

interface PendingLookup {
  query: string;
  reason: SearchReason;
  incognito: boolean;
  ts: number;
}

async function setPendingLookup(pending: PendingLookup): Promise<void> {
  await sessionArea().set({ [PENDING_KEY]: pending });
}

async function takePendingLookup(): Promise<PendingLookup | null> {
  const data = await sessionArea().get(PENDING_KEY);
  const raw = data[PENDING_KEY] as PendingLookup | undefined;
  if (!raw || typeof raw.query !== 'string') return null;
  if (Date.now() - raw.ts > 30_000) {
    await sessionArea().remove(PENDING_KEY);
    return null; // Veraltete Lookups verwerfen (Race Conditions bei Tabwechsel).
  }
  await sessionArea().remove(PENDING_KEY);
  return raw;
}

/** Selektion im aktiven Tab lesen (activeTab + scripting, alle Frames). */
async function readSelectionFromTab(tabId: number): Promise<string | null> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: () => (globalThis.getSelection?.()?.toString() ?? '')
  });
  for (const frame of results) {
    const text = typeof frame.result === 'string' ? frame.result : '';
    if (text.trim().length > 0) return text;
  }
  return null;
}

function isExtensionPdfViewer(url: string | undefined): boolean {
  return !!url && url.startsWith(chrome.runtime.getURL('pdf-viewer/viewer.html'));
}

/** Selektion aus dem eigenen PDF.js-Viewer per Nachricht lesen. */
async function readSelectionFromViewer(tabId: number): Promise<string | null> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, { type: MSG.READ_SELECTION })) as
      | { text?: string }
      | undefined;
    return typeof response?.text === 'string' ? response.text : null;
  } catch {
    return null;
  }
}

async function notifyPanel(query: string, reason: SearchReason): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: MSG.PANEL_SEARCH, query, reason });
  } catch {
    /* Panel noch nicht geladen – es holt den Lookup über GET_PENDING_LOOKUP ab. */
  }
}

/** Kernfunktion 1: Alt+W / Option+W. */
async function handleLookupCommand(tab: chrome.tabs.Tab | undefined): Promise<void> {
  const active = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!active?.id) return;
  const incognito = active.incognito === true;

  // WICHTIG (Gesture-Härtung): Das Panel muss ZUERST geöffnet werden, solange
  // die Tastatur-Geste von Alt+W noch gültig ist. chrome.sidePanel.open() darf
  // nur direkt im Rahmen einer Nutzerinteraktion aufgerufen werden; jeder
  // vorherige await (z. B. das Auslesen der Auswahl) kann die Geste verbrauchen
  // und das Öffnen still fehlschlagen lassen. Deshalb hier ein einziges Alt+W,
  // das zuverlässig öffnet UND sucht – kein zweites „Panel öffnen“-Kürzel nötig.
  const opened = await tryOpenNativePanel(active.id, active.windowId);

  let text: string | null = null;
  let reason: SearchReason = 'shortcut';

  if (isExtensionPdfViewer(active.url)) {
    text = await readSelectionFromViewer(active.id);
  } else {
    try {
      text = await readSelectionFromTab(active.id);
    } catch {
      // Privilegierte Seite / nativer PDF-Viewer: Panel ist bereits offen,
      // manuelles Suchfeld fokussieren, Erklärung anzeigen (Stufe 1).
      reason = 'pdf-fallback';
    }
  }

  const normalized = normalizeSelection(text);
  const query = normalized ?? '';
  if (!normalized && reason === 'shortcut') reason = 'no-selection';

  await setPendingLookup({ query, reason, incognito, ts: Date.now() });
  if (!opened && detectPanelKind() === 'none') {
    // Safari/kein natives Panel: Popup-/Drawer-Fallback. Der Nutzer öffnet
    // das Popup über die Toolbar; der Lookup bleibt als pending gespeichert.
  }
  if (query) await notifyPanel(query, reason);
  else await notifyPanel(' ', reason); // Leere Suche: Panel fokussiert Suchfeld.
}

// --- Kontextmenü: Rechtsklick auf markierten Text ---------------------------

const CONTEXT_MENU_ID = 'wqs-lookup-selection';

function createContextMenu(): void {
  if (!chrome.contextMenus) return;
  try {
    // removeAll dedupliziert einen evtl. noch vorhandenen Eintrag; der Callback
    // am create() schluckt einen „duplicate id“-Fehler bewusst (belt & suspenders).
    chrome.contextMenus.removeAll(() => {
      void chrome.runtime.lastError;
      chrome.contextMenus.create(
        {
          id: CONTEXT_MENU_ID,
          title: 'Auf Wikipedia nachschlagen',
          contexts: ['selection']
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    });
  } catch {
    /* contextMenus im aktuellen Browser nicht verfügbar */
  }
}

/**
 * Nachschlagen über das Kontextmenü. Der Menüklick ist eine echte Nutzergeste,
 * daher kann das Panel zuverlässig geöffnet werden. Der markierte Text kommt
 * direkt aus info.selectionText – kein Zugriff auf den Seiteninhalt nötig.
 */
async function handleContextLookup(
  rawText: string,
  tab: chrome.tabs.Tab | undefined
): Promise<void> {
  const active = tab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!active?.id) return;
  const incognito = active.incognito === true;

  const opened = await tryOpenNativePanel(active.id, active.windowId);
  const normalized = normalizeSelection(rawText);
  const query = normalized ?? '';
  const reason: SearchReason = query ? 'shortcut' : 'no-selection';

  await setPendingLookup({ query, reason, incognito, ts: Date.now() });
  void opened;
  await notifyPanel(query || ' ', reason);
}

/** Prüft nach Installation, ob der Shortcut tatsächlich registriert wurde. */
async function verifyShortcutRegistration(): Promise<void> {
  try {
    const commands = await chrome.commands.getAll();
    const lookup = commands.find((c) => c.name === 'lookup-selection');
    const registered = !!lookup?.shortcut;
    await chrome.storage.local.set({ [SHORTCUT_STATE_KEY]: registered });
  } catch {
    await chrome.storage.local.set({ [SHORTCUT_STATE_KEY]: true });
  }
}

/** On-Click-Modus: Content Script nur für erteilte Origins registrieren. */
async function syncOnClickRegistration(enabled: boolean): Promise<void> {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [ONCLICK_SCRIPT_ID] });
    if (!enabled) {
      if (existing.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids: [ONCLICK_SCRIPT_ID] });
      }
      return;
    }
    const origins = await getGrantedOrigins();
    if (origins.length === 0) {
      if (existing.length > 0) {
        await chrome.scripting.unregisterContentScripts({ ids: [ONCLICK_SCRIPT_ID] });
      }
      return; // Keine Berechtigung -> keine Registrierung.
    }
    const script: chrome.scripting.RegisteredContentScript = {
      id: ONCLICK_SCRIPT_ID,
      js: ['content/index.js'],
      matches: origins,
      runAt: 'document_idle',
      persistAcrossSessions: true
    };
    if (existing.length > 0) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
    await injectOnClickIntoOpenTabs(origins);
  } catch (err) {
    console.warn('On-Click-Registrierung fehlgeschlagen:', err);
  }
}

async function getGrantedOrigins(): Promise<string[]> {
  const granted = await chrome.permissions.getAll();
  return (granted.origins ?? []).filter((origin) => origin !== '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchPatternMatchesUrl(pattern: string, rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (pattern === '<all_urls>') return url.protocol === 'http:' || url.protocol === 'https:';

  const match = pattern.match(/^(\*|http|https):\/\/([^/]+)\/(.*)$/);
  if (!match) return false;
  const scheme = match[1];
  const hostPattern = match[2];
  const pathPattern = match[3];
  if (!scheme || !hostPattern || pathPattern === undefined) return false;
  const protocol = url.protocol.slice(0, -1);
  if (scheme !== '*' && scheme !== protocol) return false;
  if (scheme === '*' && protocol !== 'http' && protocol !== 'https') return false;

  const host = url.hostname.toLowerCase();
  const wantedHost = hostPattern.toLowerCase();
  const hostMatches =
    wantedHost === '*' ||
    (wantedHost.startsWith('*.')
      ? host === wantedHost.slice(2) || host.endsWith(`.${wantedHost.slice(2)}`)
      : host === wantedHost);
  if (!hostMatches) return false;

  const path = `${url.pathname}${url.search}${url.hash}`;
  const pathRegex = new RegExp(`^${escapeRegExp(pathPattern).replace(/\\\*/g, '.*')}$`);
  return pathRegex.test(path.slice(1));
}

function isOnClickAllowedForTab(tab: chrome.tabs.Tab, origins: string[]): boolean {
  return origins.some((origin) => matchPatternMatchesUrl(origin, tab.url));
}

async function hasContentScript(tabId: number): Promise<boolean> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, { type: MSG.PING })) as
      | { ok?: boolean }
      | undefined;
    return response?.ok === true;
  } catch {
    return false;
  }
}

async function injectOnClickIntoOpenTabs(origins: string[]): Promise<void> {
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs
      .filter((tab) => tab.id !== undefined && isOnClickAllowedForTab(tab, origins))
      .map(async (tab) => {
        const tabId = tab.id as number;
        if (await hasContentScript(tabId)) return;
        await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          files: ['content/index.js']
        });
      })
  );
}

async function broadcastOnClickState(enabled: boolean): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.allSettled(
      tabs
        .filter((t) => t.id !== undefined)
        .map((t) => chrome.tabs.sendMessage(t.id as number, { type: MSG.ONCLICK_STATE_CHANGED, enabled }))
    );
  } catch {
    /* Tabs ohne Content Script ignorieren. */
  }
}

/** Lookup aus dem On-Click-Modus: Panel aktualisieren oder Drawer-Daten liefern. */
async function handleDrawerLookup(
  query: string,
  langOverride: string | null,
  sender: chrome.runtime.MessageSender
): Promise<DrawerLookupResponse> {
  const settings = await getSettings();
  const language = coerceLanguage(langOverride ?? settings.language);
  const incognito = sender.tab?.incognito === true;

  // 1) Natives Panel aktualisieren, wenn möglich (User-Gesture erlaubt das
  //    programmatische Öffnen aus einem Klick nicht in jedem Browser).
  await setPendingLookup({ query, reason: 'onclick', incognito, ts: Date.now() });
  const opened = await tryOpenNativePanel(sender.tab?.id, sender.tab?.windowId);
  if (opened) {
    await notifyPanel(query, 'onclick');
    return { ok: true, panelOpened: true };
  }

  // 2) Fallback: Text-Daten für den In-Page-Drawer (niemals HTML).
  try {
    const results = await searchArticles(query, language);
    const best = results[0];
    if (!best) return { ok: false, panelOpened: false, errorKind: 'not-found' };
    const summary = await getArticleSummaryRaw(best.title, language);
    await addHistoryEntry(
      { query, language, resolvedTitle: summary.title, canonicalUrl: summary.canonicalUrl },
      { incognito }
    );
    return {
      ok: true,
      panelOpened: false,
      title: summary.title,
      description: summary.description,
      extractText: stripSnippetHtml(summary.untrustedIntroHtml).slice(0, 600),
      canonicalUrl: summary.canonicalUrl
    };
  } catch (err) {
    const kind = err instanceof WikipediaApiError ? err.kind : 'http';
    return { ok: false, panelOpened: false, errorKind: kind };
  }
}

function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  switch (message.type) {
    case MSG.LOOKUP_SELECTION: {
      const normalized = normalizeSelection(message.text);
      if (!normalized) return false;
      void (async () => {
        await setPendingLookup({
          query: normalized,
          reason: message.source === 'onclick' ? 'onclick' : 'shortcut',
          incognito: sender.tab?.incognito === true,
          ts: Date.now()
        });
        const opened = await tryOpenNativePanel(sender.tab?.id, sender.tab?.windowId);
        if (opened) await notifyPanel(normalized, 'shortcut');
        sendResponse({ ok: true, panelOpened: opened });
      })();
      return true;
    }
    case MSG.GET_PENDING_LOOKUP:
      void takePendingLookup().then((pending) => sendResponse(pending));
      return true;
    case MSG.GET_ONCLICK_STATE:
      void getSettings().then((s) => sendResponse({ enabled: s.onClickEnabled }));
      return true;
    case MSG.SET_ONCLICK_STATE:
      void (async () => {
        await updateSettings({ onClickEnabled: message.enabled });
        await syncOnClickRegistration(message.enabled);
        await broadcastOnClickState(message.enabled);
        sendResponse({ ok: true });
      })();
      return true;
    case MSG.DRAWER_LOOKUP:
      void handleDrawerLookup(message.query, message.language, sender).then(sendResponse);
      return true;
    case MSG.OPEN_PANEL:
      void tryOpenNativePanel(sender.tab?.id, sender.tab?.windowId).then((opened) =>
        sendResponse({ ok: opened })
      );
      return true;
    case MSG.PING:
      sendResponse({ ok: true });
      return false;
    default:
      return false;
  }
}

// --- Wiring ---------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  void verifyShortcutRegistration();
  void configureActionClickOpensPanel();
  createContextMenu();
  void getSettings().then((s) => syncOnClickRegistration(s.onClickEnabled));
});

chrome.runtime.onStartup?.addListener(() => {
  void verifyShortcutRegistration();
  // createContextMenu() hier bewusst NICHT: Kontextmenüs bleiben über Neustarts
  // erhalten. Ein zweiter Aufruf würde mit onInstalled um dieselbe ID konkurrieren
  // („Cannot create item with duplicate id“).
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  void handleContextLookup(info.selectionText ?? '', tab);
});

chrome.commands?.onCommand.addListener((command, tab) => {
  if (command === 'lookup-selection') void handleLookupCommand(tab ?? undefined);
});

// Firefox/Safari ohne setPanelBehavior: Klick auf das Toolbar-Icon.
chrome.action?.onClicked?.addListener((tab) => {
  void tryOpenNativePanel(tab.id, tab.windowId);
});

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id)) return false;
  const message = validateMessage(raw);
  if (!message) return false;
  return handleMessage(message, sender, sendResponse);
});

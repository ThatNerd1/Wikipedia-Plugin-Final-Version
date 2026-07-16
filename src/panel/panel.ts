/**
 * Side-Panel-UI (Chromium sidePanel, Firefox sidebar_action, Safari-Popup).
 * Frameworkfrei; alle API-Inhalte laufen durch den Sanitizer, alle übrigen
 * Texte werden ausschließlich über textContent gesetzt.
 */
import { MSG, SearchReason, isTrustedSender, validateMessage } from '../core/messaging/schema.js';
import { NavigationStack } from '../core/navigation/stack.js';
import { deriveFallbackQueries, normalizeSelection } from '../core/selection/normalize.js';
import {
  LANGUAGE_LABELS, LanguageCode, SUPPORTED_LANGUAGES, coerceLanguage
} from '../core/security/languages.js';
import { sanitizeWikiHtml, setSanitizedHtml } from '../core/security/sanitize.js';
import { buildFilePageUrl, isSafeExternalUrl } from '../core/security/url.js';
import {
  SavedArticle, addBookmark, filterBookmarks, isBookmarked, listBookmarks, removeBookmarkByUrl
} from '../core/storage/bookmarks.js';
import {
  SearchHistoryEntry, addHistoryEntry, clearHistory, listHistory, removeHistoryEntry
} from '../core/storage/history.js';
import { exportBookmarksJson, importBookmarksJson } from '../core/storage/importExport.js';
import { getSettings, updateSettings } from '../core/storage/settings.js';
import { getArticleHtmlRaw, getArticleSummaryRaw, searchArticles } from '../core/wikipedia/api.js';
import { pickAutoOpenResult } from '../core/wikipedia/ranking.js';
import { ArticleSummary, SearchResult, WikipediaApiError } from '../core/wikipedia/types.js';

type View = 'results' | 'history' | 'saved';

const $ = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Fehlendes Element #${id}`);
  return node as T;
};

const els = {
  back: $('wqs-back') as HTMLButtonElement,
  heading: $('wqs-heading'),
  collapse: $('wqs-collapse') as HTMLButtonElement,
  close: $('wqs-close') as HTMLButtonElement,
  search: $('wqs-search') as HTMLInputElement,
  lang: $('wqs-lang') as HTMLSelectElement,
  tabResults: $('wqs-tab-results') as HTMLButtonElement,
  tabHistory: $('wqs-tab-history') as HTMLButtonElement,
  tabSaved: $('wqs-tab-saved') as HTMLButtonElement,
  onclick: $('wqs-onclick') as HTMLInputElement,
  banner: $('wqs-banner'),
  status: $('wqs-status'),
  content: $('wqs-content'),
  attrArticle: $('wqs-attr-article') as HTMLAnchorElement,
  attrLang: $('wqs-attr-lang'),
  attrImageWrap: $('wqs-attr-image-wrap'),
  attrImage: $('wqs-attr-image') as HTMLAnchorElement,
  collapsedOverlay: $('wqs-collapsed-overlay'),
  expand: $('wqs-expand') as HTMLButtonElement
};

let language: LanguageCode = 'de';
const stacks = new Map<LanguageCode, NavigationStack>();
let view: View = 'results';
let activeAbort: AbortController | null = null;
let currentArticle: ArticleSummary | null = null;
let lastResults: SearchResult[] = [];
let lastQuery = '';
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function stack(): NavigationStack {
  let s = stacks.get(language);
  if (!s) {
    s = new NavigationStack();
    stacks.set(language, s);
  }
  return s;
}

function setStatus(text: string): void {
  els.status.textContent = text;
}

function clearContent(): HTMLElement {
  els.content.textContent = '';
  return els.content;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function updateBackButton(): void {
  els.back.disabled = !stack().canGoBack;
}

function setAttribution(article: ArticleSummary | null): void {
  els.attrLang.textContent = language;
  if (article) {
    els.attrArticle.href = article.canonicalUrl;
  } else {
    els.attrArticle.href = `https://${language}.wikipedia.org`;
  }
  const fileUrl = article?.pageImageFile ? buildFilePageUrl(language, article.pageImageFile) : null;
  if (fileUrl) {
    els.attrImage.href = fileUrl;
    els.attrImageWrap.hidden = false;
  } else {
    els.attrImageWrap.hidden = true;
  }
}

// --- Banner (Hinweise, Berechtigungsdialoge) --------------------------------

function hideBanner(): void {
  els.banner.hidden = true;
  els.banner.textContent = '';
}

function showBanner(text: string, actions: Array<{ label: string; onClick: () => void; primary?: boolean }> = []): void {
  els.banner.textContent = '';
  els.banner.appendChild(el('div', undefined, text));
  if (actions.length > 0) {
    const wrap = el('div', 'banner-actions');
    for (const action of actions) {
      const btn = el('button', action.primary ? 'btn primary' : 'btn', action.label);
      btn.addEventListener('click', action.onClick);
      wrap.appendChild(btn);
    }
    els.banner.appendChild(wrap);
  }
  els.banner.hidden = false;
}

// --- Ansichten ---------------------------------------------------------------

function showEmptyState(reason: SearchReason | 'initial' = 'initial'): void {
  view = 'results';
  syncTabs();
  const c = clearContent();
  const box = el('div', 'empty-state');
  box.appendChild(el('h2', undefined, 'Begriff nachschlagen'));
  if (reason === 'pdf-fallback') {
    const p = el('p');
    p.append(
      'Im integrierten PDF-Viewer des Browsers ist die Textauswahl für Erweiterungen nicht zugänglich. ',
      'Nutze das Suchfeld oben – oder öffne das PDF im Erweiterungs-Viewer.'
    );
    box.appendChild(p);
    const openViewer = el('button', 'btn primary', 'PDF im Erweiterungs-Viewer öffnen');
    openViewer.addEventListener('click', () => {
      void chrome.tabs.create({ url: chrome.runtime.getURL('pdf-viewer/viewer.html') });
    });
    box.appendChild(openViewer);
  } else {
    const p = el('p');
    p.append('Markiere Text auf einer Webseite und drücke ');
    const kbd = el('kbd', undefined, navigator.platform.toLowerCase().includes('mac') ? '⌥ + W' : 'Alt + W');
    p.appendChild(kbd);
    p.append(' – oder tippe oben einen Suchbegriff ein.');
    box.appendChild(p);
  }
  c.appendChild(box);
  setAttribution(null);
  els.search.focus();
}

function showError(err: unknown, retry?: () => void): void {
  const c = clearContent();
  const kind = err instanceof WikipediaApiError ? err.kind : 'http';
  const messages: Record<string, string> = {
    offline: 'Keine Internetverbindung. Bitte überprüfe deine Verbindung.',
    timeout: 'Wikipedia antwortet gerade nicht (Zeitüberschreitung).',
    ratelimited: 'Zu viele Anfragen an Wikipedia – bitte einen Moment warten.',
    'not-found': 'Kein passender Wikipedia-Artikel gefunden.',
    'invalid-response': 'Unerwartete Antwort der Wikipedia-API.',
    aborted: 'Anfrage abgebrochen.',
    http: 'Der Inhalt konnte nicht geladen werden.'
  };
  const box = el('div', 'error-box');
  box.appendChild(el('p', undefined, messages[kind] ?? messages.http ?? ''));
  if (retry && kind !== 'not-found' && kind !== 'aborted') {
    const btn = el('button', 'btn', 'Erneut versuchen');
    btn.addEventListener('click', retry);
    box.appendChild(btn);
  }
  c.appendChild(box);
  setStatus('');
}

function showLoading(text: string): void {
  const c = clearContent();
  c.appendChild(el('p', 'spinner', text));
  setStatus(text);
}

function renderResults(results: SearchResult[], query: string): void {
  view = 'results';
  syncTabs();
  const c = clearContent();
  setStatus(`${results.length} Treffer für „${query}“`);
  if (results.length === 0) {
    const box = el('div', 'empty-state');
    box.appendChild(el('h2', undefined, 'Keine Treffer'));
    box.appendChild(el('p', undefined, `Für „${query}“ wurde kein Wikipedia-Artikel gefunden.`));
    c.appendChild(box);
    return;
  }
  const list = el('ul', 'result-list');
  list.setAttribute('aria-label', 'Suchtreffer');
  for (const result of results) {
    const item = el('li', 'result-item');
    const btn = el('button', 'result-btn');
    if (result.thumbnailUrl) {
      const img = el('img', 'result-thumb');
      img.src = result.thumbnailUrl;
      img.alt = '';
      img.loading = 'lazy';
      btn.appendChild(img);
    }
    const main = el('div', 'result-main');
    const title = el('div', 'result-title', result.title);
    if (result.isDisambiguation) title.appendChild(el('span', 'badge', 'Begriffsklärung'));
    else if (result.isRedirect) title.appendChild(el('span', 'badge', 'Weiterleitung'));
    main.appendChild(title);
    const desc = result.description ?? result.snippet;
    if (desc) main.appendChild(el('div', 'result-desc', desc));
    btn.appendChild(main);
    btn.addEventListener('click', () => void openArticle(result.title, { push: true, query }));
    item.appendChild(btn);
    list.appendChild(item);
  }
  c.appendChild(list);
}

interface OpenOptions {
  push: boolean;
  query?: string;
  anchor?: string;
  fromBack?: boolean;
}

async function openArticle(title: string, options: OpenOptions): Promise<void> {
  activeAbort?.abort();
  const abort = new AbortController();
  activeAbort = abort;
  showLoading(`Lade „${title}“ …`);
  try {
    const raw = await getArticleSummaryRaw(title, language, abort.signal);
    if (abort.signal.aborted) return;
    const summary: ArticleSummary = {
      title: raw.title,
      language,
      description: raw.description,
      introHtml: sanitizeWikiHtml(raw.untrustedIntroHtml, { language }),
      canonicalUrl: raw.canonicalUrl,
      thumbnailUrl: raw.thumbnailUrl,
      pageImageFile: raw.pageImageFile,
      isDisambiguation: raw.isDisambiguation,
      redirectedFrom: raw.redirectedFrom
    };
    currentArticle = summary;
    if (options.push) {
      stack().push({
        title: summary.title, language, canonicalUrl: summary.canonicalUrl, timestamp: Date.now()
      });
    }
    updateBackButton();
    renderArticle(summary, options);
    if (options.query) {
      void addHistoryEntry({
        query: options.query, language, resolvedTitle: summary.title, canonicalUrl: summary.canonicalUrl
      });
    }
  } catch (err) {
    if (abort.signal.aborted) return;
    showError(err, () => void openArticle(title, options));
  }
}

function renderArticle(article: ArticleSummary, options: OpenOptions): void {
  view = 'results';
  syncTabs();
  const c = clearContent();
  setStatus(`Artikel „${article.title}“ geladen`);

  const head = el('div', 'article-head');
  const titleWrap = el('div');
  titleWrap.style.flex = '1';
  const h = el('h2', 'article-title', article.title);
  titleWrap.appendChild(h);
  if (article.redirectedFrom) {
    titleWrap.appendChild(el('p', 'redirect-note', `Weitergeleitet von „${article.redirectedFrom}“`));
  }
  if (article.isDisambiguation) {
    titleWrap.appendChild(el('p', 'disambig-note', 'Dies ist eine Begriffsklärungsseite – wähle unten einen Eintrag.'));
  }
  if (article.description) titleWrap.appendChild(el('p', 'article-desc', article.description));
  head.appendChild(titleWrap);
  if (article.thumbnailUrl) {
    const img = el('img', 'article-thumb');
    img.src = article.thumbnailUrl;
    img.alt = `Vorschaubild: ${article.title}`;
    img.loading = 'lazy';
    head.appendChild(img);
  }
  c.appendChild(head);

  const actions = el('div', 'article-actions');
  const saveBtn = el('button', 'btn', '☆ Speichern');
  void isBookmarked(article.canonicalUrl).then((saved) => {
    saveBtn.textContent = saved ? '★ Gespeichert' : '☆ Speichern';
    saveBtn.setAttribute('aria-pressed', String(saved));
  });
  saveBtn.addEventListener('click', () => void toggleBookmark(article, saveBtn));
  actions.appendChild(saveBtn);

  const openFull = el('a', 'btn', 'Vollständigen Artikel auf Wikipedia öffnen');
  openFull.setAttribute('href', article.canonicalUrl);
  openFull.setAttribute('target', '_blank');
  openFull.setAttribute('rel', 'noopener noreferrer');
  actions.appendChild(openFull);

  const loadFull = el('button', 'btn primary', 'Ganzen Artikel im Panel laden');
  actions.appendChild(loadFull);
  c.appendChild(actions);

  const body = el('div', 'wiki-content');
  body.setAttribute('lang', language);
  setSanitizedHtml(body, article.introHtml);
  c.appendChild(body);
  wireContentLinks(body);

  loadFull.addEventListener('click', () => void loadFullArticle(article, body, loadFull));
  if (options.anchor) scrollToAnchor(body, options.anchor);
  setAttribution(article);
  els.content.focus({ preventScroll: true });
}

async function loadFullArticle(article: ArticleSummary, body: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  btn.textContent = 'Lade Artikel …';
  try {
    const rawHtml = await getArticleHtmlRaw(article.title, language, activeAbort?.signal);
    const safe = sanitizeWikiHtml(rawHtml, { language });
    setSanitizedHtml(body, safe);
    wireContentLinks(body);
    btn.remove();
    setStatus(`Vollständiger Artikel „${article.title}“ geladen`);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Ganzen Artikel im Panel laden';
    setStatus(err instanceof WikipediaApiError && err.kind === 'ratelimited'
      ? 'Zu viele Anfragen – bitte kurz warten.'
      : 'Der vollständige Artikel konnte nicht geladen werden.');
  }
}

function scrollToAnchor(container: HTMLElement, anchor: string): void {
  // Anker nur als getElementById innerhalb des Artikelcontainers auflösen.
  const target = container.querySelector(`[id="${CSS.escape(anchor)}"]`);
  target?.scrollIntoView({ block: 'start' });
}

/** Interne Wikipedia-Links -> Panelnavigation; extern -> neuer Tab (https, noopener). */
function wireContentLinks(container: HTMLElement): void {
  container.addEventListener('click', (event) => {
    const anchorEl = (event.target as Element).closest('a');
    if (!anchorEl || !container.contains(anchorEl)) return;
    const internal = anchorEl.getAttribute('data-wqs-internal');
    const anchor = anchorEl.getAttribute('data-wqs-anchor');
    if (internal) {
      event.preventDefault();
      const lang = coerceLanguage(anchorEl.getAttribute('data-wqs-lang'), language);
      if (lang !== language) setLanguage(lang);
      void openArticle(internal, { push: true, anchor: anchor ?? undefined });
      return;
    }
    if (anchor) {
      event.preventDefault();
      scrollToAnchor(container, anchor);
      return;
    }
    // Externe Links: nur https zulassen (Sanitizer erzwingt das bereits).
    const href = anchorEl.getAttribute('href') ?? '';
    if (!isSafeExternalUrl(href)) event.preventDefault();
  });
}

async function toggleBookmark(article: ArticleSummary, btn: HTMLButtonElement): Promise<void> {
  const saved = await isBookmarked(article.canonicalUrl);
  if (saved) {
    await removeBookmarkByUrl(article.canonicalUrl);
    btn.textContent = '☆ Speichern';
    btn.setAttribute('aria-pressed', 'false');
    setStatus('Artikel aus den gespeicherten Artikeln entfernt.');
  } else {
    await addBookmark({
      title: article.title,
      language: article.language,
      canonicalUrl: article.canonicalUrl,
      description: article.description,
      thumbnailUrl: article.thumbnailUrl
    });
    btn.textContent = '★ Gespeichert';
    btn.setAttribute('aria-pressed', 'true');
    setStatus('Artikel gespeichert.');
  }
}

// --- Suche -------------------------------------------------------------------

async function runSearch(rawQuery: string, options: { auto: boolean }): Promise<void> {
  const query = normalizeSelection(rawQuery);
  if (!query) return;
  lastQuery = query;
  activeAbort?.abort();
  const abort = new AbortController();
  activeAbort = abort;
  showLoading(`Suche nach „${query}“ …`);
  try {
    let results: SearchResult[] = [];
    let used = query;
    for (const candidate of options.auto ? deriveFallbackQueries(query) : [query]) {
      results = await searchArticles(candidate, language, abort.signal);
      used = candidate;
      if (results.length > 0) break;
    }
    if (abort.signal.aborted) return;
    lastResults = results;
    const auto = options.auto ? pickAutoOpenResult(results, used) : null;
    if (auto) {
      await openArticle(auto.title, { push: true, query });
    } else {
      renderResults(results, used);
      if (results.length > 0 && used === query) {
        void addHistoryEntry({ query, language });
      }
    }
  } catch (err) {
    if (abort.signal.aborted) return;
    showError(err, () => void runSearch(query, options));
  }
}

// --- Verlauf & gespeicherte Artikel -------------------------------------------

async function renderHistory(): Promise<void> {
  view = 'history';
  syncTabs();
  const c = clearContent();
  const settings = await getSettings();
  const entries = await listHistory();
  setStatus(`Verlauf: ${entries.length} Einträge`);

  const controls = el('div', 'article-actions');
  const toggleBtn = el('button', 'btn', settings.historyEnabled ? 'Verlauf deaktivieren' : 'Verlauf aktivieren');
  toggleBtn.addEventListener('click', async () => {
    await updateSettings({ historyEnabled: !settings.historyEnabled });
    void renderHistory();
  });
  controls.appendChild(toggleBtn);
  if (entries.length > 0) {
    const clearBtn = el('button', 'btn danger', 'Gesamten Verlauf löschen');
    clearBtn.addEventListener('click', async () => {
      await clearHistory();
      void renderHistory();
    });
    controls.appendChild(clearBtn);
  }
  c.appendChild(controls);

  if (!settings.historyEnabled) {
    c.appendChild(el('p', 'list-sub', 'Der Verlauf ist deaktiviert. Suchvorgänge werden nicht gespeichert.'));
  }
  if (entries.length === 0) {
    c.appendChild(el('p', 'list-sub', 'Keine Verlaufseinträge.'));
    return;
  }
  const list = el('ul', 'plain-list');
  for (const entry of entries) {
    list.appendChild(historyRow(entry));
  }
  c.appendChild(list);
}

function historyRow(entry: SearchHistoryEntry): HTMLElement {
  const row = el('li', 'list-row');
  const main = el('div', 'list-main');
  main.setAttribute('role', 'button');
  main.setAttribute('tabindex', '0');
  main.appendChild(el('div', 'list-title', entry.resolvedTitle ?? entry.query));
  main.appendChild(
    el('div', 'list-sub', `„${entry.query}“ · ${entry.language} · ${new Date(entry.timestamp).toLocaleString()}`)
  );
  const activate = () => {
    setLanguage(entry.language);
    els.search.value = entry.query;
    void runSearch(entry.query, { auto: true });
  };
  main.addEventListener('click', activate);
  main.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });
  const remove = el('button', 'link-btn', 'Löschen');
  remove.setAttribute('aria-label', `Verlaufseintrag „${entry.query}“ löschen`);
  remove.addEventListener('click', async () => {
    await removeHistoryEntry(entry.id);
    void renderHistory();
  });
  row.append(main, remove);
  return row;
}

async function renderSaved(filter = ''): Promise<void> {
  view = 'saved';
  syncTabs();
  const c = clearContent();
  const all = await listBookmarks();
  const entries = filterBookmarks(all, filter);
  setStatus(`Gespeicherte Artikel: ${entries.length}`);

  const controls = el('div', 'article-actions');
  const filterInput = el('input') as HTMLInputElement;
  filterInput.type = 'search';
  filterInput.placeholder = 'Gespeicherte filtern …';
  filterInput.value = filter;
  filterInput.id = 'wqs-saved-filter';
  filterInput.setAttribute('aria-label', 'Gespeicherte Artikel filtern');
  filterInput.style.flex = '1';
  filterInput.addEventListener('input', () => void renderSavedListOnly(filterInput.value));
  controls.appendChild(filterInput);

  const exportBtn = el('button', 'btn', 'Export (JSON)');
  exportBtn.addEventListener('click', async () => {
    const json = await exportBookmarksJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wikipedia-quick-search-bookmarks.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
  controls.appendChild(exportBtn);

  const importBtn = el('button', 'btn', 'Import');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setStatus('Importdatei überschreitet das Größenlimit von 1 MB.');
      return;
    }
    const text = await file.text();
    const result = await importBookmarksJson(text);
    setStatus(result.ok
      ? `Import: ${result.imported} übernommen, ${result.skipped} übersprungen.`
      : `Import fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    void renderSaved();
  });
  importBtn.addEventListener('click', () => fileInput.click());
  controls.append(importBtn, fileInput);
  c.appendChild(controls);

  const listWrap = el('div');
  listWrap.id = 'wqs-saved-list';
  c.appendChild(listWrap);
  renderSavedEntries(listWrap, entries);
}

async function renderSavedListOnly(filter: string): Promise<void> {
  const wrap = document.getElementById('wqs-saved-list');
  if (!wrap) return;
  const entries = filterBookmarks(await listBookmarks(), filter);
  renderSavedEntries(wrap as HTMLElement, entries);
}

function renderSavedEntries(wrap: HTMLElement, entries: SavedArticle[]): void {
  wrap.textContent = '';
  if (entries.length === 0) {
    wrap.appendChild(el('p', 'list-sub', 'Keine gespeicherten Artikel.'));
    return;
  }
  const list = el('ul', 'plain-list');
  for (const entry of entries) {
    const row = el('li', 'list-row');
    const main = el('div', 'list-main');
    main.setAttribute('role', 'button');
    main.setAttribute('tabindex', '0');
    main.appendChild(el('div', 'list-title', entry.title));
    if (entry.description) main.appendChild(el('div', 'list-sub', entry.description));
    const activate = () => {
      setLanguage(entry.language);
      void openArticle(entry.title, { push: true });
    };
    main.addEventListener('click', activate);
    main.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
    const remove = el('button', 'link-btn', 'Entfernen');
    remove.setAttribute('aria-label', `„${entry.title}“ aus gespeicherten Artikeln entfernen`);
    remove.addEventListener('click', async () => {
      await removeBookmarkByUrl(entry.canonicalUrl);
      void renderSavedListOnly((document.getElementById('wqs-saved-filter') as HTMLInputElement | null)?.value ?? '');
    });
    row.append(main, remove);
    list.appendChild(row);
  }
  wrap.appendChild(list);
}

// --- On-Click-Modus & Berechtigungen ------------------------------------------

async function requestOnClickPermission(): Promise<boolean> {
  // Aktive Tab-URL nur lesbar, wenn activeTab/Hostrecht vorliegt – ehrlich abfragen.
  let origin: string | null = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:/.test(tab.url)) origin = new URL(tab.url).origin + '/*';
  } catch { /* Kein Zugriff auf die Tab-URL. */ }

  return new Promise<boolean>((resolve) => {
    const finish = (granted: boolean) => { hideBanner(); resolve(granted); };
    const actions: Array<{ label: string; onClick: () => void; primary?: boolean }> = [];
    if (origin) {
      actions.push({
        label: 'Nur auf dieser Website aktivieren',
        primary: true,
        onClick: () => void chrome.permissions.request({ origins: [origin as string] }).then(finish, () => finish(false))
      });
    }
    actions.push({
      label: 'Auf allen Websites aktivieren',
      onClick: () => void chrome.permissions.request({ origins: ['<all_urls>'] }).then(finish, () => finish(false))
    });
    actions.push({ label: 'Abbrechen', onClick: () => finish(false) });
    showBanner(
      'Der Klick-Modus schlägt angeklickte Wörter direkt nach. Dafür braucht die Erweiterung ' +
      'Zugriff auf die Inhalte der jeweiligen Website. Ohne diese Berechtigung funktioniert ' +
      'weiterhin alles per Tastenkürzel (Alt+W/⌥+W). Berechtigungen lassen sich in den ' +
      'Einstellungen jederzeit widerrufen.',
      actions
    );
  });
}

async function setOnClickEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    const granted = await requestOnClickPermission();
    if (!granted) {
      els.onclick.checked = false;
      setStatus('Klick-Modus nicht aktiviert (Berechtigung abgelehnt oder abgebrochen).');
      return;
    }
  }
  await chrome.runtime.sendMessage({ type: MSG.SET_ONCLICK_STATE, enabled });
  setStatus(enabled ? 'Klick-Modus aktiviert.' : 'Klick-Modus deaktiviert.');
}

// --- Sprache -------------------------------------------------------------------

function setLanguage(lang: LanguageCode): void {
  if (lang === language) return;
  language = lang;
  els.lang.value = lang;
  void updateSettings({ language: lang });
  updateBackButton();
  setAttribution(currentArticle && currentArticle.language === lang ? currentArticle : null);
}

// --- Panel schließen / einklappen ------------------------------------------------

interface SidebarGlobals {
  browser?: { sidebarAction?: { close?: () => Promise<void> } };
}

async function closePanel(): Promise<void> {
  const g = globalThis as unknown as SidebarGlobals;
  if (typeof g.browser?.sidebarAction?.close === 'function') {
    try {
      await g.browser.sidebarAction.close();
      return;
    } catch { /* fällt auf window.close() zurück */ }
  }
  window.close(); // Chromium-Side-Panel/Popup schließt das eigene Dokument.
  // Falls der Browser das ignoriert: Hinweis auf den nativen Schließen-Weg.
  setTimeout(() => {
    showBanner('Dieses Panel lässt sich über das Panel-Menü bzw. das Seitenleisten-Symbol des Browsers schließen.');
  }, 250);
}

function collapsePanel(collapsed: boolean): void {
  els.collapsedOverlay.hidden = !collapsed;
  for (const node of [els.content, els.banner, els.status]) {
    node.style.visibility = collapsed ? 'hidden' : '';
  }
  if (!collapsed) els.search.focus();
  else els.expand.focus();
}

// --- Initialisierung --------------------------------------------------------------

async function checkShortcutRegistration(): Promise<void> {
  try {
    const data = await chrome.storage.local.get('wqs.shortcutRegistered');
    if (data['wqs.shortcutRegistered'] === false) {
      showBanner(
        'Das Tastenkürzel Alt+W konnte nicht registriert werden (vermutlich belegt es eine andere ' +
        'Erweiterung). Du kannst es manuell festlegen: Chrome/Edge unter „Erweiterungen → ' +
        'Tastenkürzel“, Firefox unter „Add-ons verwalten → Zahnrad → Tastenkürzel verwalten“.',
        [{ label: 'Verstanden', onClick: hideBanner, primary: true }]
      );
    }
  } catch { /* Storage nicht verfügbar */ }
}

function syncTabs(): void {
  els.tabResults.setAttribute('aria-pressed', String(view === 'results'));
  els.tabHistory.setAttribute('aria-pressed', String(view === 'history'));
  els.tabSaved.setAttribute('aria-pressed', String(view === 'saved'));
}

async function handlePendingLookup(): Promise<void> {
  try {
    const pending = (await chrome.runtime.sendMessage({ type: MSG.GET_PENDING_LOOKUP })) as
      | { query: string; reason: SearchReason }
      | null;
    if (pending && pending.query.trim()) {
      els.search.value = pending.query;
      await runSearch(pending.query, { auto: true });
      return;
    }
    showEmptyState(pending?.reason === 'pdf-fallback' ? 'pdf-fallback' : 'initial');
  } catch {
    showEmptyState();
  }
}

async function init(): Promise<void> {
  const settings = await getSettings();
  language = settings.language;
  document.documentElement.dataset.theme = settings.theme === 'auto' ? '' : settings.theme;

  for (const code of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} – ${LANGUAGE_LABELS[code]}`;
    els.lang.appendChild(option);
  }
  els.lang.value = language;
  els.onclick.checked = settings.onClickEnabled;

  els.lang.addEventListener('change', () => {
    setLanguage(coerceLanguage(els.lang.value));
    if (lastQuery) void runSearch(lastQuery, { auto: false });
  });

  // Debouncing bei manueller Eingabe; Suche nur bei Enter oder nach Pause.
  els.search.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const value = els.search.value;
    if (value.trim().length < 2) return;
    debounceTimer = setTimeout(() => void runSearch(value, { auto: false }), 350);
  });
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      void runSearch(els.search.value, { auto: false });
    }
  });

  els.back.addEventListener('click', () => {
    const prev = stack().back();
    updateBackButton();
    if (prev) void openArticle(prev.title, { push: false, fromBack: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowLeft' && !els.back.disabled) {
      e.preventDefault();
      els.back.click();
    }
  });

  els.tabResults.addEventListener('click', () => {
    if (lastResults.length > 0) renderResults(lastResults, lastQuery);
    else showEmptyState();
  });
  els.tabHistory.addEventListener('click', () => void renderHistory());
  els.tabSaved.addEventListener('click', () => void renderSaved());
  els.onclick.addEventListener('change', () => void setOnClickEnabled(els.onclick.checked));
  els.close.addEventListener('click', () => void closePanel());
  els.collapse.addEventListener('click', () => collapsePanel(true));
  els.expand.addEventListener('click', () => collapsePanel(false));

  chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
    if (!isTrustedSender(sender, chrome.runtime.id)) return false;
    const message = validateMessage(raw);
    if (!message) return false;
    if (message.type === MSG.PANEL_SEARCH) {
      const query = message.query.trim();
      if (query) {
        els.search.value = query;
        void runSearch(query, { auto: true });
      } else {
        showEmptyState(message.reason === 'pdf-fallback' ? 'pdf-fallback' : 'initial');
      }
      sendResponse({ ok: true });
    }
    if (message.type === MSG.ONCLICK_STATE_CHANGED) {
      els.onclick.checked = message.enabled;
    }
    return false;
  });

  await checkShortcutRegistration();
  await handlePendingLookup();
}

void init();

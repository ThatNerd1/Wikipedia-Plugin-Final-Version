/**
 * Content Script für den On-Click-Modus.
 * Wird NUR über scripting.registerContentScripts registriert, nachdem der
 * Nutzer den Modus aktiv eingeschaltet und die Host-Berechtigung erteilt hat.
 *
 * Sicherheitsgrundsätze:
 * - Kein Umschließen von Wörtern mit HTML-Elementen, kein DOM-Umbau.
 * - Klicks auf interaktive Elemente werden ignoriert.
 * - Normale Seitennavigation wird niemals verhindert.
 * - Listener werden beim Deaktivieren vollständig entfernt.
 */
import { MSG, validateMessage, isTrustedSender, DrawerLookupResponse } from '../core/messaging/schema.js';
import { normalizeSelection, stripSurroundingPunctuation } from '../core/selection/normalize.js';
import { wordAt } from '../core/selection/segment.js';
import { detectLanguageFromTag } from '../core/security/languages.js';
import { removeDrawer, showDrawerError, showDrawerLoading, showDrawerResult } from './drawer.js';

const INTERACTIVE_SELECTOR = [
  'a', 'button', 'input', 'textarea', 'select', 'option', 'label',
  '[contenteditable]', '[contenteditable] *',
  'code', 'pre', 'kbd', 'samp',
  'audio', 'video', 'embed', 'object', 'iframe', 'canvas',
  'summary', 'dialog',
  '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="checkbox"]',
  '[role="radio"]', '[role="switch"]', '[role="tab"]', '[role="menuitem"]',
  '[role="combobox"]', '[role="option"]', '[role="slider"]', '[role="searchbox"]',
  '[role="spinbutton"]', '[role="listbox"]', '[role="menu"]', '[role="toolbar"]'
].join(',');

let enabled = false;
let indicator: HTMLElement | null = null;

// --- Sichtbarer Aktiv-Indikator (geschlossenes Shadow DOM) -----------------

function showIndicator(): void {
  if (indicator) return;
  indicator = document.createElement('div');
  indicator.id = 'wqs-onclick-indicator';
  const root = indicator.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .badge {
      position: fixed; bottom: 12px; right: 12px; z-index: 2147483646;
      background: #3366cc; color: #fff; font: 12px/1 system-ui, sans-serif;
      padding: 6px 10px; border-radius: 999px; box-shadow: 0 2px 8px rgba(0,0,0,.25);
      user-select: none; pointer-events: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .badge { transition: opacity .2s ease; }
    }`;
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = 'Wikipedia: Klick-Modus aktiv';
  root.append(style, badge);
  document.documentElement.appendChild(indicator);
}

function hideIndicator(): void {
  indicator?.remove();
  indicator = null;
}

// --- Wort unter dem Klick ermitteln ----------------------------------------

interface DocWithCaret {
  caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?(x: number, y: number): Range | null;
}

function caretAtPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as unknown as DocWithCaret;
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos?.offsetNode) return { node: pos.offsetNode, offset: pos.offset };
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range?.startContainer) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

function wordAtClick(event: MouseEvent): string | null {
  const caret = caretAtPoint(event.clientX, event.clientY);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;
  const text = caret.node.textContent ?? '';
  const locale = detectLanguageFromTag(document.documentElement.lang) ?? 'de';
  const word = wordAt(text, caret.offset, locale);
  return word ? stripSurroundingPunctuation(word) : null;
}

// --- Klick-Handler ----------------------------------------------------------

function onClick(event: MouseEvent): void {
  if (!enabled) return;
  if (event.defaultPrevented) return;
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(INTERACTIVE_SELECTOR)) return; // Navigation/Interaktion nie stören.

  // Bestehende Textauswahl hat Vorrang vor dem Einzelwort.
  const selection = normalizeSelection(window.getSelection()?.toString());
  const word = selection ?? normalizeSelection(wordAtClick(event));
  if (!word) return;

  void lookup(word);
}

async function lookup(query: string): Promise<void> {
  const language = detectLanguageFromTag(document.documentElement.lang);
  try {
    const response = (await chrome.runtime.sendMessage({
      type: MSG.DRAWER_LOOKUP,
      query,
      language
    })) as DrawerLookupResponse | undefined;
    if (!response) return;
    if (response.panelOpened) {
      removeDrawer(); // Natives Panel übernimmt die Anzeige.
      return;
    }
    if (!response.ok) {
      showDrawerLoading(query);
      showDrawerError(response.errorKind);
      return;
    }
    showDrawerResult(response);
  } catch {
    /* Extension-Kontext invalidiert (Update) – bewusst still bleiben. */
  }
}

// --- Aktivierung / Deaktivierung -------------------------------------------

function enable(): void {
  if (enabled) return;
  enabled = true;
  document.addEventListener('click', onClick, { capture: false, passive: true });
  showIndicator();
}

function disable(): void {
  if (!enabled) {
    hideIndicator();
    removeDrawer();
    return;
  }
  enabled = false;
  document.removeEventListener('click', onClick, { capture: false });
  hideIndicator();
  removeDrawer();
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id)) return false;
  const message = validateMessage(raw);
  if (!message) return false;
  if (message.type === MSG.PING) {
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === MSG.ONCLICK_STATE_CHANGED) {
    if (message.enabled) enable();
    else disable();
    sendResponse({ ok: true });
  }
  return false;
});

// Initialen Zustand beim Background erfragen.
void (async () => {
  try {
    const state = (await chrome.runtime.sendMessage({ type: MSG.GET_ONCLICK_STATE })) as
      | { enabled?: boolean }
      | undefined;
    if (state?.enabled === true) enable();
  } catch {
    /* Background nicht erreichbar – Modus bleibt aus. */
  }
})();

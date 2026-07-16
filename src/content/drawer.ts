import { DrawerLookupResponse } from '../core/messaging/schema.js';

/**
 * Sicherer In-Page-Drawer als Fallback für Browser ohne natives Side Panel
 * (Safari) bzw. wenn das programmatische Öffnen des Panels nicht erlaubt ist.
 * - geschlossenes Shadow DOM (Hostseite kann Inhalte nicht auslesen/stylen)
 * - ausschließlich textContent, niemals HTML aus API-Daten
 * - verschiebbar und einklappbar, blockiert keine Seiteninhalte dauerhaft
 */

const HOST_ID = 'wqs-drawer-host';

const DRAWER_CSS = `
:host { all: initial; }
.drawer {
  position: fixed; top: 16px; right: 16px; z-index: 2147483646;
  width: 320px; max-width: calc(100vw - 32px); max-height: 70vh;
  background: #ffffff; color: #1a1a1a;
  border: 1px solid #c8c8c8; border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0,0,0,.18);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  display: flex; flex-direction: column; overflow: hidden;
}
@media (prefers-color-scheme: dark) {
  .drawer { background: #1f2023; color: #eaeaea; border-color: #45474a; }
  .head { background: #2a2b2e; }
  .btn { color: #eaeaea; }
}
.head {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  background: #f2f3f5; cursor: grab; user-select: none;
}
.head:active { cursor: grabbing; }
.title { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn {
  border: 0; background: transparent; cursor: pointer; font-size: 15px;
  padding: 4px 6px; border-radius: 6px; color: #1a1a1a;
}
.btn:hover { background: rgba(127,127,127,.18); }
.btn:focus-visible { outline: 2px solid #3366cc; outline-offset: 1px; }
.body { padding: 10px 12px; overflow: auto; }
.desc { color: #6a6f74; margin: 0 0 6px; font-size: 12.5px; }
.extract { margin: 0 0 10px; }
.link { color: #3366cc; text-decoration: underline; word-break: break-all; }
.attribution { font-size: 11px; color: #6a6f74; border-top: 1px solid rgba(127,127,127,.25); padding-top: 6px; margin-top: 6px; }
.collapsed .body { display: none; }
.status { padding: 10px 12px; }
`;

interface DrawerRefs {
  host: HTMLElement;
  root: ShadowRoot;
  drawer: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
}

let refs: DrawerRefs | null = null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function ensureDrawer(): DrawerRefs {
  if (refs && document.getElementById(HOST_ID)) return refs;
  const host = el('div');
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = DRAWER_CSS;
  root.appendChild(style);

  const drawer = el('div', 'drawer');
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Wikipedia Quick Search');

  const head = el('div', 'head');
  const title = el('span', 'title', 'Wikipedia Quick Search');
  const collapseBtn = el('button', 'btn', '–');
  collapseBtn.setAttribute('aria-label', 'Einklappen');
  const closeBtn = el('button', 'btn', '×');
  closeBtn.setAttribute('aria-label', 'Schließen');
  head.append(title, collapseBtn, closeBtn);

  const body = el('div', 'body');
  drawer.append(head, body);
  root.appendChild(drawer);
  document.documentElement.appendChild(host);

  collapseBtn.addEventListener('click', () => {
    drawer.classList.toggle('collapsed');
    collapseBtn.textContent = drawer.classList.contains('collapsed') ? '+' : '–';
    collapseBtn.setAttribute(
      'aria-label',
      drawer.classList.contains('collapsed') ? 'Ausklappen' : 'Einklappen'
    );
  });
  closeBtn.addEventListener('click', removeDrawer);

  // Verschiebbar per Pointer-Drag am Kopfbereich.
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  head.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('button')) return;
    dragging = true;
    const rect = drawer.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - offsetX));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offsetY));
    drawer.style.left = `${x}px`;
    drawer.style.top = `${y}px`;
    drawer.style.right = 'auto';
  });
  const stop = () => { dragging = false; };
  head.addEventListener('pointerup', stop);
  head.addEventListener('pointercancel', stop);

  refs = { host, root, drawer, title, body };
  return refs;
}

export function removeDrawer(): void {
  document.getElementById(HOST_ID)?.remove();
  refs = null;
}

export function showDrawerLoading(query: string): void {
  const { body, title } = ensureDrawer();
  title.textContent = `Suche: ${query}`;
  body.textContent = '';
  body.appendChild(el('p', 'status', 'Wird geladen …'));
}

export function showDrawerError(kind: string | undefined): void {
  const { body } = ensureDrawer();
  body.textContent = '';
  const msg =
    kind === 'offline' ? 'Keine Internetverbindung.' :
    kind === 'ratelimited' ? 'Zu viele Anfragen – bitte kurz warten.' :
    kind === 'not-found' ? 'Kein passender Wikipedia-Artikel gefunden.' :
    'Der Artikel konnte nicht geladen werden.';
  body.appendChild(el('p', 'status', msg));
}

export function showDrawerResult(data: DrawerLookupResponse): void {
  const { body, title } = ensureDrawer();
  body.textContent = '';
  title.textContent = data.title ?? 'Wikipedia Quick Search';

  if (data.description) body.appendChild(el('p', 'desc', data.description));
  if (data.extractText) body.appendChild(el('p', 'extract', data.extractText));

  if (data.canonicalUrl) {
    try {
      const url = new URL(data.canonicalUrl);
      if (url.protocol === 'https:' && /\.wikipedia\.org$/.test(url.hostname)) {
        const link = el('a', 'link', 'Vollständigen Artikel auf Wikipedia öffnen');
        link.setAttribute('href', url.href);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        body.appendChild(link);
      }
    } catch {
      /* ungültige URL: keinen Link rendern */
    }
  }
  body.appendChild(
    el('p', 'attribution', 'Quelle: Wikipedia – Texte unter CC BY-SA 4.0.')
  );
}

/**
 * Eigener PDF.js-Viewer (Stufe 2 der PDF-Strategie).
 * - PDF.js wird lokal gebündelt; keine Remote Scripts.
 * - Eingebettete PDF-Skripte werden nicht ausgeführt (enableScripting: false,
 *   isEvalSupported: false).
 * - Textschicht ermöglicht Auswahl; Alt+W/⌥+W und Klick-Modus funktionieren.
 * - Remote-PDFs werden nur nach bewusster Nutzeraktion geladen; bei
 *   CORS-Blockade wird eine optionale Host-Berechtigung angeboten.
 */
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { MSG, validateMessage, isTrustedSender } from '../core/messaging/schema.js';
import { normalizeSelection, stripSurroundingPunctuation } from '../core/selection/normalize.js';
import { wordAt } from '../core/selection/segment.js';
import { getSettings } from '../core/storage/settings.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf-viewer/pdf.worker.min.mjs');

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const container = $('pv-container');
const statusBox = $('pv-status');
const sourceBox = $('pv-source');
const pageInfo = $('pv-pageinfo');

let pdf: PDFDocumentProxy | null = null;
let currentPage = 1;
let scale = 1.25;
let onClickEnabled = false;

function setStatus(text: string): void {
  statusBox.textContent = text;
}

function validateRemoteUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

async function renderPage(num: number): Promise<void> {
  if (!pdf) return;
  currentPage = Math.max(1, Math.min(num, pdf.numPages));
  container.textContent = '';
  const page = await pdf.getPage(currentPage);
  const viewport = page.getViewport({ scale });

  const wrap = document.createElement('div');
  wrap.className = 'page-wrap';
  wrap.style.width = `${viewport.width}px`;
  wrap.style.height = `${viewport.height}px`;

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width * devicePixelRatio;
  canvas.height = viewport.height * devicePixelRatio;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  wrap.appendChild(canvas);

  const textLayerDiv = document.createElement('div');
  textLayerDiv.className = 'textLayer';
  textLayerDiv.style.width = `${viewport.width}px`;
  textLayerDiv.style.height = `${viewport.height}px`;
  wrap.appendChild(textLayerDiv);

  container.appendChild(wrap);
  await page.render({ canvasContext: ctx, viewport }).promise;

  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent(),
    container: textLayerDiv,
    viewport
  });
  await textLayer.render();

  pageInfo.textContent = `Seite ${currentPage} / ${pdf.numPages}`;
  setStatus('');
}

async function loadDocument(source: { url?: string; data?: ArrayBuffer }, label: string): Promise<void> {
  setStatus('PDF wird geladen …');
  try {
    const task = pdfjsLib.getDocument({
      ...(source.url ? { url: source.url } : {}),
      ...(source.data ? { data: source.data } : {}),
      isEvalSupported: false,
      enableScripting: false,
      disableAutoFetch: false
    } as Parameters<typeof pdfjsLib.getDocument>[0]);
    pdf = await task.promise;
    sourceBox.textContent = label;
    await renderPage(1);
  } catch (err) {
    pdf = null;
    const message = err instanceof Error ? err.message : String(err);
    if (source.url && /CORS|NetworkError|Failed to fetch|fetch/i.test(message)) {
      offerHostPermission(source.url);
    } else {
      setStatus(`Das PDF konnte nicht geladen werden: ${message}`);
    }
  }
}

/** CORS-blockierte Remote-PDFs: optionale Host-Berechtigung anbieten. */
function offerHostPermission(url: string): void {
  let originPattern: string;
  try {
    originPattern = new URL(url).origin + '/*';
  } catch {
    setStatus('Ungültige PDF-URL.');
    return;
  }
  statusBox.textContent = '';
  const p = document.createElement('span');
  p.textContent =
    `Die Quelle erlaubt keinen direkten Abruf (CORS). Du kannst der Erweiterung Zugriff auf ${originPattern} gewähren, um das PDF zu laden: `;
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Zugriff erlauben und laden';
  btn.addEventListener('click', async () => {
    const granted = await chrome.permissions.request({ origins: [originPattern] });
    if (granted) void loadDocument({ url }, url);
    else setStatus('Zugriff nicht gewährt. Lade das PDF herunter und öffne es lokal.');
  });
  statusBox.append(p, btn);
}

// --- Auswahl / Nachschlagen -------------------------------------------------

function currentSelection(): string | null {
  return normalizeSelection(window.getSelection()?.toString());
}

async function lookup(text: string): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: MSG.LOOKUP_SELECTION, text, source: 'shortcut' });
  } catch {
    /* Background nicht erreichbar. */
  }
}

// Alt+W lokal (falls das globale Command das Extension-Dokument nicht erreicht).
document.addEventListener('keydown', (e) => {
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key.toLowerCase() === 'w' || e.code === 'KeyW')) {
    const text = currentSelection();
    if (text) {
      e.preventDefault();
      void lookup(text);
    }
  }
});

// Klick-Modus in der Textschicht.
interface DocWithCaret {
  caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?(x: number, y: number): Range | null;
}

container.addEventListener('click', (e) => {
  if (!onClickEnabled) return;
  const target = e.target as Element;
  if (!target.closest('.textLayer')) return;
  const existing = currentSelection();
  if (existing) {
    void lookup(existing);
    return;
  }
  const doc = document as unknown as DocWithCaret;
  const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY) ??
    (doc.caretRangeFromPoint?.(e.clientX, e.clientY)
      ? { offsetNode: doc.caretRangeFromPoint(e.clientX, e.clientY)!.startContainer,
          offset: doc.caretRangeFromPoint(e.clientX, e.clientY)!.startOffset }
      : null);
  if (!pos || pos.offsetNode.nodeType !== Node.TEXT_NODE) return;
  const word = wordAt(pos.offsetNode.textContent ?? '', pos.offset);
  if (word) void lookup(stripSurroundingPunctuation(word));
});

// READ_SELECTION vom Background (globales Alt+W-Command im Viewer-Tab).
chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (!isTrustedSender(sender, chrome.runtime.id)) return false;
  const message = validateMessage(raw);
  if (message?.type === MSG.READ_SELECTION) {
    sendResponse({ text: window.getSelection()?.toString() ?? '' });
  }
  if (message?.type === MSG.ONCLICK_STATE_CHANGED) {
    onClickEnabled = message.enabled;
  }
  return false;
});

// --- Toolbar ------------------------------------------------------------------

$('pv-prev').addEventListener('click', () => void renderPage(currentPage - 1));
$('pv-next').addEventListener('click', () => void renderPage(currentPage + 1));
$('pv-zoom-in').addEventListener('click', () => { scale = Math.min(scale + 0.25, 4); void renderPage(currentPage); });
$('pv-zoom-out').addEventListener('click', () => { scale = Math.max(scale - 0.25, 0.5); void renderPage(currentPage); });

const fileInput = $('pv-file') as HTMLInputElement;
$('pv-open-local').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (file.size > 200 * 1024 * 1024) {
    setStatus('Die Datei ist größer als 200 MB und wird nicht geladen.');
    return;
  }
  const data = await file.arrayBuffer();
  void loadDocument({ data }, `Lokale Datei: ${file.name}`);
});

// --- Initialisierung -------------------------------------------------------------

void (async () => {
  const settings = await getSettings();
  onClickEnabled = settings.onClickEnabled;

  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  if (src) {
    const url = validateRemoteUrl(src);
    if (!url) {
      setStatus('Nur https-URLs werden unterstützt.');
      return;
    }
    // Bewusste Nutzeraktion: Remote-PDF erst nach Bestätigung laden.
    statusBox.textContent = '';
    const p = document.createElement('span');
    p.textContent = `Remote-PDF laden? ${url.href} `;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Laden';
    btn.addEventListener('click', () => void loadDocument({ url: url.href }, url.href));
    statusBox.append(p, btn);
  }
})();

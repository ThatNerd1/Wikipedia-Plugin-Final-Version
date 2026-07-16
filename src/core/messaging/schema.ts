import { LanguageCode, isSupportedLanguage } from '../security/languages.js';

/**
 * Explizit definierte Nachrichtentypen zwischen Extension-Kontexten.
 * Jede eingehende Nachricht wird zur Laufzeit validiert (validateMessage).
 * Nachrichteninhalte werden niemals als Code oder HTML interpretiert.
 */

export const MSG = {
  LOOKUP_SELECTION: 'wqs/lookup-selection',
  GET_PENDING_LOOKUP: 'wqs/get-pending-lookup',
  PANEL_SEARCH: 'wqs/panel-search',
  GET_ONCLICK_STATE: 'wqs/get-onclick-state',
  SET_ONCLICK_STATE: 'wqs/set-onclick-state',
  ONCLICK_STATE_CHANGED: 'wqs/onclick-state-changed',
  DRAWER_LOOKUP: 'wqs/drawer-lookup',
  OPEN_PANEL: 'wqs/open-panel',
  CLOSE_PANEL: 'wqs/close-panel',
  READ_SELECTION: 'wqs/read-selection',
  PING: 'wqs/ping'
} as const;

export type LookupSource = 'shortcut' | 'onclick' | 'manual';
export type SearchReason = 'shortcut' | 'onclick' | 'pdf-fallback' | 'no-selection';

export interface LookupSelectionMessage {
  type: typeof MSG.LOOKUP_SELECTION;
  text: string;
  source: LookupSource;
}
export interface GetPendingLookupMessage { type: typeof MSG.GET_PENDING_LOOKUP }
export interface PanelSearchMessage {
  type: typeof MSG.PANEL_SEARCH;
  query: string;
  reason: SearchReason;
}
export interface GetOnClickStateMessage { type: typeof MSG.GET_ONCLICK_STATE }
export interface SetOnClickStateMessage { type: typeof MSG.SET_ONCLICK_STATE; enabled: boolean }
export interface OnClickStateChangedMessage { type: typeof MSG.ONCLICK_STATE_CHANGED; enabled: boolean }
export interface DrawerLookupMessage {
  type: typeof MSG.DRAWER_LOOKUP;
  query: string;
  language: LanguageCode | null;
}
export interface OpenPanelMessage { type: typeof MSG.OPEN_PANEL }
export interface ClosePanelMessage { type: typeof MSG.CLOSE_PANEL }
export interface ReadSelectionMessage { type: typeof MSG.READ_SELECTION }
export interface PingMessage { type: typeof MSG.PING }

export type ExtensionMessage =
  | LookupSelectionMessage
  | GetPendingLookupMessage
  | PanelSearchMessage
  | GetOnClickStateMessage
  | SetOnClickStateMessage
  | OnClickStateChangedMessage
  | DrawerLookupMessage
  | OpenPanelMessage
  | ClosePanelMessage
  | ReadSelectionMessage
  | PingMessage;

const MAX_TEXT = 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isShortString(v: unknown, max = MAX_TEXT): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

/**
 * Validiert eine eingehende Runtime-Nachricht strikt gegen das Schema.
 * Gibt null zurück, wenn die Nachricht ungültig ist.
 */
export function validateMessage(raw: unknown): ExtensionMessage | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null;
  switch (raw.type) {
    case MSG.LOOKUP_SELECTION:
      if (!isShortString(raw.text)) return null;
      if (raw.source !== 'shortcut' && raw.source !== 'onclick' && raw.source !== 'manual') return null;
      return { type: MSG.LOOKUP_SELECTION, text: raw.text, source: raw.source };
    case MSG.GET_PENDING_LOOKUP:
      return { type: MSG.GET_PENDING_LOOKUP };
    case MSG.PANEL_SEARCH:
      if (!isShortString(raw.query)) return null;
      if (
        raw.reason !== 'shortcut' && raw.reason !== 'onclick' &&
        raw.reason !== 'pdf-fallback' && raw.reason !== 'no-selection'
      ) return null;
      return { type: MSG.PANEL_SEARCH, query: raw.query, reason: raw.reason };
    case MSG.GET_ONCLICK_STATE:
      return { type: MSG.GET_ONCLICK_STATE };
    case MSG.SET_ONCLICK_STATE:
      if (typeof raw.enabled !== 'boolean') return null;
      return { type: MSG.SET_ONCLICK_STATE, enabled: raw.enabled };
    case MSG.ONCLICK_STATE_CHANGED:
      if (typeof raw.enabled !== 'boolean') return null;
      return { type: MSG.ONCLICK_STATE_CHANGED, enabled: raw.enabled };
    case MSG.DRAWER_LOOKUP:
      if (!isShortString(raw.query)) return null;
      return {
        type: MSG.DRAWER_LOOKUP,
        query: raw.query,
        language: isSupportedLanguage(raw.language) ? raw.language : null
      };
    case MSG.OPEN_PANEL:
      return { type: MSG.OPEN_PANEL };
    case MSG.CLOSE_PANEL:
      return { type: MSG.CLOSE_PANEL };
    case MSG.READ_SELECTION:
      return { type: MSG.READ_SELECTION };
    case MSG.PING:
      return { type: MSG.PING };
    default:
      return null;
  }
}

/**
 * Prüft den Absender: Nachrichten werden nur aus der eigenen Erweiterung
 * akzeptiert (sender.id === runtime.id). Webseiten erreichen diesen Kanal
 * nicht; externe Erweiterungen werden abgewiesen.
 */
export function isTrustedSender(
  sender: { id?: string } | undefined,
  runtimeId: string
): boolean {
  return !!sender && sender.id === runtimeId;
}

/** Antwort auf DRAWER_LOOKUP: ausschließlich reiner Text, niemals HTML. */
export interface DrawerLookupResponse {
  ok: boolean;
  panelOpened: boolean;
  title?: string;
  description?: string;
  extractText?: string;
  canonicalUrl?: string;
  errorKind?: string;
}

/** Antwort auf READ_SELECTION aus dem PDF-Viewer. */
export interface ReadSelectionResponse {
  text: string;
}

/**
 * Browseradapter mit Feature Detection (keine reine User-Agent-Erkennung).
 * - Chromium/Edge: chrome.sidePanel
 * - Firefox: browser.sidebarAction
 * - Safari/andere: kein natives Panel -> In-Page-Drawer als Fallback
 */

type AnyFn = (...args: never[]) => unknown;

interface SidePanelApi {
  open?: (options: { tabId?: number; windowId?: number }) => Promise<void>;
  setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void>;
  setOptions?: (options: { tabId?: number; path?: string; enabled?: boolean }) => Promise<void>;
}

interface SidebarActionApi {
  open?: () => Promise<void>;
  close?: () => Promise<void>;
  toggle?: () => Promise<void>;
  isOpen?: (options: Record<string, never>) => Promise<boolean>;
}

interface GlobalApis {
  chrome?: { sidePanel?: SidePanelApi };
  browser?: { sidebarAction?: SidebarActionApi };
}

function apis(): GlobalApis {
  return globalThis as unknown as GlobalApis;
}

export type PanelKind = 'chromium-side-panel' | 'firefox-sidebar' | 'none';

export function detectPanelKind(): PanelKind {
  const g = apis();
  if (g.browser?.sidebarAction && typeof g.browser.sidebarAction.open === 'function') {
    return 'firefox-sidebar';
  }
  if (g.chrome?.sidePanel && typeof g.chrome.sidePanel.open === 'function') {
    return 'chromium-side-panel';
  }
  return 'none';
}

/**
 * Versucht, das native Panel zu öffnen. Gibt false zurück, wenn der Browser
 * dies im aktuellen Kontext nicht erlaubt (z. B. fehlende User-Gesture) –
 * der Aufrufer nutzt dann den In-Page-Drawer.
 */
export async function tryOpenNativePanel(tabId?: number, windowId?: number): Promise<boolean> {
  const g = apis();
  try {
    switch (detectPanelKind()) {
      case 'firefox-sidebar':
        await g.browser?.sidebarAction?.open?.();
        return true;
      case 'chromium-side-panel':
        if (windowId !== undefined) {
          await g.chrome?.sidePanel?.open?.({ windowId });
        } else if (tabId !== undefined) {
          await g.chrome?.sidePanel?.open?.({ tabId });
        } else {
          return false;
        }
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Programmatic close nur nach Feature Detection; sonst false. */
export async function tryCloseNativePanel(): Promise<boolean> {
  const g = apis();
  try {
    if (typeof g.browser?.sidebarAction?.close === 'function') {
      await g.browser.sidebarAction.close();
      return true;
    }
    // Chromium: Es gibt keine dokumentierte sidePanel.close()-API.
    // Das Panel-Dokument kann sich selbst über window.close() schließen.
    return false;
  } catch {
    return false;
  }
}

export async function configureActionClickOpensPanel(): Promise<void> {
  const g = apis();
  try {
    await g.chrome?.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
  } catch {
    /* Nicht unterstützt (Firefox/Safari) – Manifest regelt das Verhalten. */
  }
}

/** Läuft dieser Kontext in einem Browser mit registrierbaren Commands-API-Shortcuts? */
export function hasCommandsApi(): boolean {
  const g = globalThis as unknown as { chrome?: { commands?: { getAll?: AnyFn } } };
  return typeof g.chrome?.commands?.getAll === 'function';
}

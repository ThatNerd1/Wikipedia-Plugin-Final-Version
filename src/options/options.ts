/** Einstellungsseite: Sprache, Datenschutz, Berechtigungen, Tastenkürzel-Status. */
import { MSG } from '../core/messaging/schema.js';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, coerceLanguage } from '../core/security/languages.js';
import { clearAllLocalData } from '../core/storage/importExport.js';
import { getSettings, updateSettings } from '../core/storage/settings.js';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function renderOrigins(): Promise<void> {
  const list = $('opt-origins') as HTMLUListElement;
  const empty = $('opt-origins-empty');
  list.textContent = '';
  const all = await chrome.permissions.getAll();
  const origins = all.origins ?? [];
  empty.hidden = origins.length > 0;
  for (const origin of origins) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = origin === '<all_urls>' ? 'Alle Websites' : origin;
    const btn = document.createElement('button');
    btn.textContent = 'Widerrufen';
    btn.className = 'danger';
    btn.setAttribute('aria-label', `Berechtigung für ${span.textContent} widerrufen`);
    btn.addEventListener('click', async () => {
      await chrome.permissions.remove({ origins: [origin] });
      // Content-Script-Registrierung an den neuen Stand anpassen.
      const settings = await getSettings();
      await chrome.runtime.sendMessage({ type: MSG.SET_ONCLICK_STATE, enabled: settings.onClickEnabled });
      void renderOrigins();
    });
    li.append(span, btn);
    list.appendChild(li);
  }
}

async function init(): Promise<void> {
  const settings = await getSettings();

  const lang = $('opt-lang') as HTMLSelectElement;
  for (const code of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} – ${LANGUAGE_LABELS[code]}`;
    lang.appendChild(option);
  }
  lang.value = settings.language;
  lang.addEventListener('change', () => void updateSettings({ language: coerceLanguage(lang.value) }));

  const autodetect = $('opt-autodetect') as HTMLInputElement;
  autodetect.checked = settings.autoDetectLanguage;
  autodetect.addEventListener('change', () => void updateSettings({ autoDetectLanguage: autodetect.checked }));

  const theme = $('opt-theme') as HTMLSelectElement;
  theme.value = settings.theme;
  theme.addEventListener('change', () => {
    const value = theme.value === 'light' || theme.value === 'dark' ? theme.value : 'auto';
    void updateSettings({ theme: value });
  });

  const history = $('opt-history') as HTMLInputElement;
  history.checked = settings.historyEnabled;
  history.addEventListener('change', () => void updateSettings({ historyEnabled: history.checked }));

  $('opt-clear-all').addEventListener('click', async () => {
    await clearAllLocalData();
    $('opt-clear-status').textContent = 'Alle lokalen Daten wurden gelöscht.';
  });

  try {
    const data = await chrome.storage.local.get('wqs.shortcutRegistered');
    $('opt-shortcut-state').textContent =
      data['wqs.shortcutRegistered'] === false
        ? '⚠ Das Tastenkürzel ist derzeit NICHT registriert (vermutlich durch eine andere Erweiterung belegt). Bitte manuell festlegen – Anleitung unten.'
        : '✓ Das Tastenkürzel ist registriert.';
  } catch { /* Status optional */ }

  await renderOrigins();
}

void init();

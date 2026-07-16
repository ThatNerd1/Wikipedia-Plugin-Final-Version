import { DEFAULT_LANGUAGE, LanguageCode, coerceLanguage } from '../security/languages.js';
import { settingsArea } from './area.js';

export interface Settings {
  language: LanguageCode;
  autoDetectLanguage: boolean;
  historyEnabled: boolean;
  onClickEnabled: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  language: DEFAULT_LANGUAGE,
  autoDetectLanguage: false,
  historyEnabled: true,
  onClickEnabled: false,
  theme: 'auto'
};

const KEY = 'wqs.settings';

function coerceSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    language: coerceLanguage(r.language),
    autoDetectLanguage: r.autoDetectLanguage === true,
    historyEnabled: r.historyEnabled !== false,
    onClickEnabled: r.onClickEnabled === true,
    theme: r.theme === 'light' || r.theme === 'dark' ? r.theme : 'auto'
  };
}

export async function getSettings(): Promise<Settings> {
  try {
    const data = await settingsArea().get(KEY);
    return coerceSettings(data[KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = coerceSettings({ ...current, ...patch });
  await settingsArea().set({ [KEY]: next });
  return next;
}

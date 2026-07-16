/**
 * Explizite Allowlist unterstützter Wikipedia-Sprachversionen.
 * Es werden niemals Subdomains aus unvalidierter Eingabe gebildet.
 */
export const SUPPORTED_LANGUAGES = [
  'de', 'en', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'sv', 'tr'
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'de';

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  sv: 'Svenska',
  tr: 'Türkçe'
};

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Validiert einen Sprachcode; unbekannte Codes fallen auf den Default zurück. */
export function coerceLanguage(value: unknown, fallback: LanguageCode = DEFAULT_LANGUAGE): LanguageCode {
  return isSupportedLanguage(value) ? value : fallback;
}

/** Sprachvorauswahl aus einem BCP-47-Tag (z. B. document.documentElement.lang). */
export function detectLanguageFromTag(tag: string | null | undefined): LanguageCode | null {
  if (typeof tag !== 'string') return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/, 1)[0] ?? '';
  return isSupportedLanguage(primary) ? primary : null;
}

/** Origin der Wikipedia-Sprachversion – ausschließlich aus der Allowlist. */
export function wikipediaOrigin(lang: LanguageCode): string {
  if (!isSupportedLanguage(lang)) throw new Error(`Unsupported language: ${String(lang)}`);
  return `https://${lang}.wikipedia.org`;
}

export function apiEndpoint(lang: LanguageCode): string {
  return `${wikipediaOrigin(lang)}/w/api.php`;
}

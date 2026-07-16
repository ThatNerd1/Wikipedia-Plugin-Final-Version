import { LanguageCode } from '../security/languages.js';

export interface SearchResult {
  title: string;
  /** Reines Text-Snippet (bereits von HTML befreit). */
  snippet: string;
  pageId: number;
  isDisambiguation: boolean;
  isRedirect: boolean;
  description?: string;
  thumbnailUrl?: string;
}

export interface ArticleSummary {
  title: string;
  language: LanguageCode;
  description?: string;
  /** Sanitisiertes HTML der Einleitung. */
  introHtml: string;
  canonicalUrl: string;
  thumbnailUrl?: string;
  /** Dateiname des Vorschaubilds (für den Link zur Dateibeschreibungsseite). */
  pageImageFile?: string;
  isDisambiguation: boolean;
  redirectedFrom?: string;
  lastModified?: string;
}

export interface ArticleHtml {
  title: string;
  language: LanguageCode;
  /** Sanitisiertes HTML des vollständigen Artikels. */
  html: string;
}

export type ApiErrorKind = 'offline' | 'timeout' | 'http' | 'ratelimited' | 'invalid-response' | 'not-found' | 'aborted';

export class WikipediaApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'WikipediaApiError';
    this.kind = kind;
    this.status = status;
  }
}

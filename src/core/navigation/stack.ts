import { LanguageCode } from '../security/languages.js';

export interface ArticleNavigationEntry {
  title: string;
  language: LanguageCode;
  canonicalUrl: string;
  timestamp: number;
}

const MAX_STACK = 50;

/**
 * Eigener Navigationsstack pro Panelinstanz.
 * Verändert niemals den Browserverlauf des eigentlichen Tabs.
 */
export class NavigationStack {
  private entries: ArticleNavigationEntry[] = [];
  private index = -1;

  get current(): ArticleNavigationEntry | null {
    return this.entries[this.index] ?? null;
  }

  get canGoBack(): boolean {
    return this.index > 0;
  }

  get depth(): number {
    return this.entries.length;
  }

  push(entry: ArticleNavigationEntry): void {
    // Vorwärtseinträge verwerfen (wie klassische Verlaufsnavigation).
    this.entries = this.entries.slice(0, this.index + 1);
    const top = this.entries[this.entries.length - 1];
    if (top && top.title === entry.title && top.language === entry.language) {
      this.index = this.entries.length - 1;
      return; // Unmittelbare Duplikate nicht stapeln.
    }
    this.entries.push(entry);
    if (this.entries.length > MAX_STACK) {
      this.entries.shift();
    }
    this.index = this.entries.length - 1;
  }

  back(): ArticleNavigationEntry | null {
    if (!this.canGoBack) return null;
    this.index -= 1;
    return this.current;
  }

  reset(): void {
    this.entries = [];
    this.index = -1;
  }
}

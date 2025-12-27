import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Language = 'ar' | 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private http = inject(HttpClient);

  // Supported languages
  supportedLanguages: Language[] = ['ar', 'en', 'fr'];
  
  // Default language is Arabic
  language = signal<Language>('ar');
  translations = signal<Record<string, any>>({});

  constructor() {
    // Attempt to load saved language from localStorage
    if (typeof localStorage !== 'undefined') {
        const savedLang = localStorage.getItem('platinumStoreLang');
        if (savedLang && this.supportedLanguages.includes(savedLang as Language)) {
          this.language.set(savedLang as Language);
        }
    }
    // Load translations as soon as the service is created.
    this.initialize();
  }

  /**
   * Initializes the service by loading the current language file.
   * This is called once at application startup.
   */
  initialize(): Promise<void> {
    return this.loadLanguage(this.language());
  }

  /**
   * Sets the application language and loads the corresponding translation file.
   * @param lang The language to set.
   */
  setLanguage(lang: Language): Promise<void> {
    this.language.set(lang);
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('platinumStoreLang', lang);
    }
    return this.loadLanguage(lang);
  }

  /**
   * Loads a translation file using HttpClient.
   * @param lang The language file to load.
   */
  private loadLanguage(lang: Language): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            // Path is relative to index.html, which is the web root. 'src' is not part of the public path.
            const path = `assets/i18n/${lang}.json`;
            const translations = await firstValueFrom(this.http.get<Record<string, any>>(path));
            if (!translations) {
                throw new Error(`Translations for "${lang}" could not be loaded or are empty.`);
            }
            this.translations.set(translations);
            resolve();
        } catch (error) {
            console.error(`CRITICAL: Failed to fetch language JSON for "${lang}". Translations will not work.`, error);
            this.translations.set({});
            reject(error);
        }
    });
  }

  /**
   * Translates a key into the corresponding string.
   * Supports nested keys using dot notation (e.g., "login.storeName").
   * @param key The translation key.
   * @param params Optional parameters for placeholder replacement.
   * @returns The translated string or the key itself if not found.
   */
  translate(key: string, params: Record<string, string> = {}): string {
    const keys = key.split('.');
    let result: any = this.translations();
    
    // Traverse the nested object to find the translation string.
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        result = undefined; // Key path not found
        break;
      }
    }

    // Use the found string or fall back to the original key.
    let translation = (typeof result === 'string') ? result : key;

    // Replace any placeholders (e.g., {{name}}) with provided params.
    for (const paramKey in params) {
        translation = translation.replace(`{{${paramKey}}}`, params[paramKey]);
    }
    return translation;
  }
}
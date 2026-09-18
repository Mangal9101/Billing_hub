export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_KEY = 'billing_hub_language';

export function getLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'hi' ? 'hi' : 'en';
}

export function setLanguage(language: AppLanguage) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_KEY, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent('billing-hub-language-change', { detail: language }));
}

export function applyGoogleLanguage(language: AppLanguage) {
  if (typeof document === 'undefined') return;

  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (!select) return;

  const value = language === 'hi' ? 'hi' : 'en';
  if (select.value !== value) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

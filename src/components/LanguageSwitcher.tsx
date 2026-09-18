'use client';

import { useEffect, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { getLanguage, setLanguage, applyGoogleLanguage, type AppLanguage } from '@/lib/language';

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [language, setCurrentLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    setCurrentLanguage(getLanguage());
    document.documentElement.lang = getLanguage();

    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      setCurrentLanguage(next);
    };

    window.addEventListener('billing-hub-language-change', onLanguageChange);
    return () => window.removeEventListener('billing-hub-language-change', onLanguageChange);
  }, []);

  const choose = (next: AppLanguage) => {
    setCurrentLanguage(next);
    setLanguage(next);

    // Google Translate can load a little after the app. Retry briefly so the
    // choice works even on the first click after a fresh install.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      applyGoogleLanguage(next);
      if (document.querySelector('.goog-te-combo') || attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 150);

    setOpen(false);
  };

  return (
    <div className="fixed left-2 bottom-2 z-[90] lg:left-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground shadow-lg hover:bg-secondary hover:text-foreground"
        aria-label="Language"
        title="Language"
      >
        <Languages size={16} />
        <span>{language === 'hi' ? 'हिन्दी' : 'English'}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-36 rounded-xl border border-border bg-card p-1.5 shadow-xl">
          <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Language
          </p>

          {([
            ['en', 'English'],
            ['hi', 'हिन्दी'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-left hover:bg-secondary"
            >
              <span className="flex-1">{label}</span>
              {language === value && <Check size={15} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

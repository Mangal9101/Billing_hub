'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { getLanguage, setLanguage, applyGoogleLanguage, type AppLanguage } from '@/lib/language';

interface LanguageSwitcherProps {
  collapsed?: boolean;
  mobile?: boolean;
}

export default function LanguageSwitcher({ collapsed = false, mobile = false }: LanguageSwitcherProps) {
  const [language, setCurrentLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    const current = getLanguage();
    setCurrentLanguage(current);
    document.documentElement.lang = current;

    const onLanguageChange = (event: Event) => {
      setCurrentLanguage((event as CustomEvent<AppLanguage>).detail);
    };

    window.addEventListener('billing-hub-language-change', onLanguageChange);
    return () => window.removeEventListener('billing-hub-language-change', onLanguageChange);
  }, []);

  const choose = (next: AppLanguage) => {
    setCurrentLanguage(next);
    setLanguage(next);

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      applyGoogleLanguage(next);
      if (document.querySelector('.goog-te-combo') || attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 150);
  };

  if (collapsed && !mobile) {
    return (
      <button
        type="button"
        onClick={() => choose(language === 'en' ? 'hi' : 'en')}
        className="w-full flex items-center justify-center px-2 py-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        title={language === 'hi' ? 'हिन्दी' : 'English'}
        aria-label="Language"
      >
        <Languages size={16} />
      </button>
    );
  }

  return (
    <div className="px-2 py-1.5 mb-1">
      <div className="flex items-center gap-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Languages size={13} />
        <span>Language</span>
      </div>

      <select
        value={language}
        onChange={(e) => choose(e.target.value as AppLanguage)}
        className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Language"
      >
        <option value="hi">हिन्दी</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}

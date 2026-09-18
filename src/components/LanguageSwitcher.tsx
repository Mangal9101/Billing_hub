'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { getLanguage, setLanguage, type AppLanguage } from '@/lib/language';

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
  };

  if (collapsed && !mobile) {
    return (
      <button
        type="button"
        onClick={() => choose(language === 'en' ? 'hi' : 'en')}
        className="w-full h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        title={language === 'hi' ? 'हिन्दी' : 'English'}
        aria-label="Language"
      >
        <Languages size={16} />
      </button>
    );
  }

  return (
    <div className="mx-1 my-1 rounded-xl border border-border/70 bg-secondary/30 p-2.5">
      <div className="flex items-center gap-2 px-0.5 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Languages size={13} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-none text-foreground">
            Language
          </p>
          <p className="mt-1 text-[9px] leading-none text-muted-foreground">
            Choose language
          </p>
        </div>
      </div>

      <select
        value={language}
        onChange={(e) => choose(e.target.value as AppLanguage)}
        className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
        aria-label="Language"
      >
        <option value="hi">हिन्दी</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}

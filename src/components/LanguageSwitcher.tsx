'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { getLanguage, setLanguage, type AppLanguage } from '@/lib/language';

export default function LanguageSwitcher() {
  const [language, setCurrentLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    const current = getLanguage();
    setCurrentLanguage(current);
    document.documentElement.lang = current;
  }, []);

  const choose = (next: AppLanguage) => {
    setCurrentLanguage(next);
    setLanguage(next);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Languages size={14} />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">
            {language === 'hi' ? 'भाषा' : 'Language'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {language === 'hi' ? 'भाषा चुनें' : 'Choose language'}
          </p>
        </div>
      </div>

      <select
        value={language}
        onChange={(e) => choose(e.target.value as AppLanguage)}
        className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-sm outline-none transition-colors hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15"
        aria-label={language === 'hi' ? 'भाषा' : 'Language'}
      >
        <option value="hi">हिन्दी</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}

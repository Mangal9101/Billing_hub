'use client';

import { useEffect } from 'react';
import { applyLocalLanguage, getLanguage } from '@/lib/language';

export default function LocalLanguageRuntime() {
  useEffect(() => {
    const apply = () => applyLocalLanguage(getLanguage());

    apply();

    const observer = new MutationObserver(() => {
      apply();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

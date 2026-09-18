'use client';

import { useEffect } from 'react';
import { applyLocalLanguage, getLanguage } from '@/lib/language';

export default function LocalLanguageRuntime() {
  useEffect(() => {
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      applyLocalLanguage(getLanguage());
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

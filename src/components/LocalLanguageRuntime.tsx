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

    // Catch route changes and UI updates that do not always mutate the body
    // immediately (Next.js client navigation, dialogs, toasts, charts, etc.).
    const onRouteChange = () => schedule();
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('billing-hub-language-change', onRouteChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('billing-hub-language-change', onRouteChange);
    };
  }, []);

  return null;
}

'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay?: boolean;
            layout?: number;
          },
          elementId: string
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = 'billing-hub-google-translate-script';

export default function GoogleTranslate() {
  useEffect(() => {
    const init = () => {
      if (!window.google?.translate?.TranslateElement) return;
      if (document.getElementById('google_translate_element')?.children.length) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,hi',
          autoDisplay: false,
          layout: 0,
        },
        'google_translate_element'
      );
    };

    window.googleTranslateElementInit = init;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);
    } else {
      init();
    }

    return () => {
      delete window.googleTranslateElementInit;
    };
  }, []);

  return (
    <>
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      <style jsx global>{`
        .goog-te-banner-frame,
        .goog-te-balloon-frame,
        .skiptranslate iframe {
          display: none !important;
        }

        body {
          top: 0 !important;
        }

        .goog-tooltip,
        .goog-tooltip:hover {
          display: none !important;
        }

        .goog-text-highlight {
          background: transparent !important;
          box-shadow: none !important;
        }

        #google_translate_element {
          display: none !important;
        }
      `}</style>
    </>
  );
}

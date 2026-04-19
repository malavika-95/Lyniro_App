"use client";

import { useEffect } from "react";

import "@/lib/console-capture";
// import "@/utils/screenshot-capture"; // Disabled: html2canvas causes build issues with Next.js 15

export function AppGenProvider({ children }) {
  useEffect(() => {
    const hideErrorOverlay = () => {
      const selectors = [
        'nextjs-portal',
        '[data-nextjs-dialog]',
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-toast]',
        '#__next-build-indicator',
        '[data-nextjs-scroll]',
      ];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.style.display = 'none';
        });
      });
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Issue')) {
          btn.style.display = 'none';
          btn.parentElement && (btn.parentElement.style.display = 'none');
        }
      });
    };

    hideErrorOverlay();
    const interval = setInterval(hideErrorOverlay, 1000);
    const observer = new MutationObserver(hideErrorOverlay);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => { clearInterval(interval); observer.disconnect(); };
  }, []);

  return <>{children}</>;
}

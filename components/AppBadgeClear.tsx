'use client';

import { useEffect } from 'react';

export default function AppBadgeClear() {
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage('CLEAR_BADGE');
        })
        .catch(() => {});
    }
  }, []);

  return null;
}

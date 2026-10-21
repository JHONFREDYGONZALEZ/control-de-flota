'use client';

import { useEffect } from 'react';

const KEY = 'cf-warm-v2-at';
const EVERY_MS = 30 * 60 * 1000;

/** Con buena conexión, deja guardadas en el celular las pantallas más usadas para poder abrirlas sin señal */
export default function OfflineWarmup({ urls }: { urls: string[] }) {
  const joined = urls.join('|');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;
    const conn = (navigator as any).connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType || '')) return;
    try {
      if (Date.now() - Number(localStorage.getItem(KEY) || 0) < EVERY_MS) return;
    } catch {
      return;
    }

    let cancelled = false;
    const run = async () => {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active || !navigator.serviceWorker.controller) return;
      for (const url of joined.split('|')) {
        if (cancelled || !navigator.onLine) return;
        try {
          await fetch(url, { headers: { 'x-cf-warm': '1' }, credentials: 'same-origin' });
        } catch {
          return;
        }
      }
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* sin almacenamiento local */
      }
    };

    const w = window as any;
    const handle = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 8000 }) : setTimeout(run, 4000);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, [joined]);

  return null;
}

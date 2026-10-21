'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { discardItem, flush, getState, onSynced, refreshState, retryFailed, subscribe, syncIdentity } from '@/lib/offline/sync';

const EMPTY = { pending: [], failed: [], syncing: false, authRequired: false };

export default function OfflineSync() {
  const router = useRouter();
  const state = useSyncExternalStore(subscribe, getState, () => EMPTY);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setOnline(navigator.onLine);
        void flush();
      }
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVisible);

    void refreshState().then(async () => {
      await syncIdentity();
      await flush();
    });
    const timer = setInterval(() => {
      if (getState().pending.length > 0) void flush();
    }, 20000);
    const stopSynced = onSynced(() => router.refresh());

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
      stopSynced();
    };
  }, [router]);

  const { pending, failed, syncing, authRequired } = state;
  const total = pending.length + failed.length;
  if (online && total === 0) return null;

  let tone = 'bg-amber text-white';
  let message: string;
  if (failed.length > 0) {
    tone = 'bg-red text-white';
    message = `${failed.length} registro${failed.length === 1 ? '' : 's'} no se pudo${failed.length === 1 ? '' : 'ieron'} enviar`;
  } else if (authRequired) {
    message = `Tu sesión venció. Inicia sesión para enviar ${pending.length} registro${pending.length === 1 ? '' : 's'} guardado${pending.length === 1 ? '' : 's'}`;
  } else if (!online && pending.length > 0) {
    message = `Sin señal: ${pending.length} registro${pending.length === 1 ? '' : 's'} guardado${pending.length === 1 ? '' : 's'} en el celular, se enviará${pending.length === 1 ? '' : 'n'} solo${pending.length === 1 ? '' : 's'}`;
  } else if (!online) {
    message = 'Sin señal: puedes seguir trabajando, los registros se enviarán al volver la conexión';
  } else if (syncing) {
    message = `Enviando ${pending.length} registro${pending.length === 1 ? '' : 's'}…`;
  } else {
    message = `${pending.length} registro${pending.length === 1 ? '' : 's'} pendiente${pending.length === 1 ? '' : 's'} de enviar`;
  }

  return (
    <div className={`sticky top-0 z-[9000] text-xs shadow-md ${tone}`}>
      <button
        type="button"
        onClick={() => total > 0 && setOpen((o) => !o)}
        className="w-full px-4 py-2 text-left font-semibold flex justify-between items-center gap-2"
      >
        <span>{message}</span>
        {total > 0 && <span aria-hidden>{open ? '▲' : '▼'}</span>}
      </button>
      {open && total > 0 && (
        <div className="bg-panel text-text px-4 py-2 border-b border-border space-y-1.5">
          {[...failed, ...pending].map((i) => (
            <div key={i.id} className="flex justify-between items-center gap-2">
              <span>
                {i.label}{' '}
                <span className={i.status === 'failed' ? 'text-red' : 'text-dim'}>
                  {i.status === 'failed' ? `· ${i.error || 'error'}` : '· en espera'}
                </span>
              </span>
              {i.status === 'failed' && (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => void discardItem(i.id)}>
                  Descartar
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            {failed.length > 0 && (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => void retryFailed()}>
                Reintentar
              </button>
            )}
            {pending.length > 0 && online && !authRequired && (
              <button type="button" className="btn btn-sm" onClick={() => void flush()}>
                Enviar ahora
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

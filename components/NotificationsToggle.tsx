'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription, removePushSubscription } from '@/app/notifications/actions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationsToggle() {
  const [status, setStatus] = useState<'checking' | 'unsupported' | 'off' | 'on' | 'denied' | 'busy'>('checking');

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? 'on' : 'off');
    })();
  }, []);

  async function enable() {
    setStatus('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('Falta configurar la clave pública VAPID');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await savePushSubscription(sub.toJSON() as any);
      setStatus('on');
    } catch {
      setStatus('off');
    }
  }

  async function disable() {
    setStatus('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch {
      setStatus('on');
    }
  }

  if (status === 'checking') return null;
  if (status === 'unsupported') return null;

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-sm">Notificaciones de nuevas órdenes</div>
          <div className="text-dim text-xs mt-1">
            {status === 'on' && 'Activadas: te avisaremos en este celular cuando se genere una orden de trabajo.'}
            {status === 'off' && 'Actívalas para enterarte apenas se genere una orden de trabajo por aprobar.'}
            {status === 'denied' && 'Las bloqueaste para este sitio. Actívalas desde los ajustes del navegador para este sitio.'}
            {status === 'busy' && 'Procesando…'}
          </div>
        </div>
        {status === 'off' && (
          <button onClick={enable} className="btn btn-primary btn-sm">
            Activar
          </button>
        )}
        {status === 'on' && (
          <button onClick={disable} className="btn btn-ghost btn-sm">
            Desactivar
          </button>
        )}
      </div>
    </div>
  );
}

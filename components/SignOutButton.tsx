'use client';

import { signOut } from '@/app/login/actions';
import { getState, setStoredUserId } from '@/lib/offline/sync';

export default function SignOutButton() {
  return (
    <form
      action={signOut}
      onSubmit={(e) => {
        const { pending, failed } = getState();
        const n = pending.length + failed.length;
        if (n > 0 && !window.confirm(`Tienes ${n} registro(s) sin enviar. Se conservan en este celular y se enviarán cuando vuelvas a iniciar sesión. ¿Salir de todos modos?`)) {
          e.preventDefault();
          return;
        }
        setStoredUserId(null);
        navigator.serviceWorker?.controller?.postMessage('CLEAR_CACHE');
      }}
    >
      <button className="btn btn-ghost btn-sm">Salir</button>
    </form>
  );
}

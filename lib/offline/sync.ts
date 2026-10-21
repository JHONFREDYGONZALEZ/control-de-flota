import { resizeImage } from '@/lib/image';
import { ACTIONS, type ActionKey } from './registry';
import { type QueueItem, deleteItem, getAllItems, putItem, toFormData } from './queue';

export type SyncState = {
  pending: QueueItem[];
  failed: QueueItem[];
  syncing: boolean;
  authRequired: boolean;
};

const MAX_ATTEMPTS = 5;
const IMAGE_RECOMPRESS_OVER = 900 * 1024;
const USER_KEY = 'cf-user-id';

let state: SyncState = { pending: [], failed: [], syncing: false, authRequired: false };
const listeners = new Set<() => void>();
const syncedListeners = new Set<() => void>();

export const getState = () => state;
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function onSynced(l: () => void) {
  syncedListeners.add(l);
  return () => {
    syncedListeners.delete(l);
  };
}
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getStoredUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}
export function setStoredUserId(id: string | null) {
  try {
    if (id) localStorage.setItem(USER_KEY, id);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* sin almacenamiento local; se ignora */
  }
}

export async function refreshState() {
  try {
    const items = await getAllItems();
    setState({
      pending: items.filter((i) => i.status === 'pending'),
      failed: items.filter((i) => i.status === 'failed'),
    });
  } catch {
    /* IndexedDB no disponible */
  }
}

type Probe = { status: 'ok'; id: string } | { status: 'unauth' } | { status: 'offline' };

/** Confirma que hay internet real (no solo wifi) y que la sesión sigue activa */
export async function probe(): Promise<Probe> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/me', { cache: 'no-store', signal: ctrl.signal });
    if (res.status === 401) return { status: 'unauth' };
    if (!res.ok) return { status: 'offline' };
    const json = await res.json();
    return json?.id ? { status: 'ok', id: json.id } : { status: 'unauth' };
  } catch {
    return { status: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

/** Guarda el id del usuario actual en el celular para asociarle los registros pendientes */
export async function syncIdentity() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const p = await probe();
  if (p.status === 'ok') setStoredUserId(p.id);
  else if (p.status === 'unauth') setStoredUserId(null);
}

export function isNetworkError(err: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String((err as any)?.message || '');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|aborted|connection/i.test(msg);
}

/** Guarda el registro en el celular y lo intenta enviar de inmediato */
export async function enqueue(action: ActionKey, label: string, formData: FormData) {
  const fields: QueueItem['fields'] = [];
  for (const [key, value] of formData.entries()) {
    if (key === 'clientId' || key === 'capturedAt' || key.startsWith('$ACTION')) continue;
    if (typeof value === 'string') {
      fields.push([key, value]);
      continue;
    }
    if (value.size === 0) continue;
    let file: File = value;
    if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.size > IMAGE_RECOMPRESS_OVER) {
      try {
        file = await resizeImage(file);
      } catch {
        /* si no se puede comprimir, se guarda la original */
      }
    }
    fields.push([key, file]);
  }

  await putItem({
    id: crypto.randomUUID(),
    action,
    label,
    userId: getStoredUserId(),
    createdAt: new Date().toISOString(),
    fields,
    attempts: 0,
    status: 'pending',
  });
  await refreshState();
  void flush();
}

let running = false;

async function doFlush() {
  if (running) return;
  running = true;
  try {
    const items = await getAllItems().catch(() => [] as QueueItem[]);
    if (!items.some((i) => i.status === 'pending')) return;

    setState({ syncing: true });
    const p = await probe();
    if (p.status === 'offline') return;
    if (p.status === 'unauth') {
      setState({ authRequired: true });
      return;
    }
    setStoredUserId(p.id);
    setState({ authRequired: false });

    let synced = 0;
    for (const item of items) {
      if (item.status !== 'pending') continue;
      if (item.userId && item.userId !== p.id) continue;

      const fn = ACTIONS[item.action as ActionKey];
      if (!fn) {
        await putItem({ ...item, status: 'failed', error: 'Acción desconocida (la app se actualizó)' });
        continue;
      }
      try {
        await fn(toFormData(item));
        await deleteItem(item.id);
        synced++;
      } catch (err) {
        if (isNetworkError(err)) break;
        const attempts = item.attempts + 1;
        await putItem({
          ...item,
          attempts,
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          error: 'El servidor no aceptó el registro',
        });
      }
      await refreshState();
    }
    if (synced > 0) syncedListeners.forEach((l) => l());
  } finally {
    running = false;
    setState({ syncing: false });
    await refreshState();
  }
}

/** Envía los pendientes en orden. Seguro de llamar muchas veces (una sola ejecución a la vez, también entre pestañas). */
export async function flush() {
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
  if (locks?.request) {
    await locks.request('cf-flush', { ifAvailable: true }, async (lock: unknown) => {
      if (lock) await doFlush();
    });
  } else {
    await doFlush();
  }
}

export async function retryFailed() {
  const items = await getAllItems();
  for (const i of items) {
    if (i.status === 'failed') await putItem({ ...i, status: 'pending', attempts: 0, error: undefined });
  }
  await refreshState();
  await flush();
}

export async function discardItem(id: string) {
  await deleteItem(id);
  await refreshState();
}

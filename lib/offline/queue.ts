export type QueueItem = {
  id: string;
  action: string;
  label: string;
  userId: string | null;
  createdAt: string;
  fields: [string, string | File][];
  attempts: number;
  status: 'pending' | 'failed';
  error?: string;
};

const DB_NAME = 'cf-offline';
const STORE = 'queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const putItem = (item: QueueItem) => run('readwrite', (s) => s.put(item));
export const deleteItem = (id: string) => run('readwrite', (s) => s.delete(id));
export const getAllItems = async () =>
  (await run<QueueItem[]>('readonly', (s) => s.getAll())).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export function toFormData(item: QueueItem): FormData {
  const fd = new FormData();
  for (const [k, v] of item.fields) {
    if (typeof v === 'string') fd.append(k, v);
    else fd.append(k, v, v.name);
  }
  fd.set('clientId', item.id);
  fd.set('capturedAt', item.createdAt);
  return fd;
}

import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clientIdOf(formData: FormData): string | null {
  const id = String(formData.get('clientId') || '');
  return UUID_RE.test(id) ? id : null;
}

/** id estable para una fila creada por este registro: un reintento produce el mismo id y no duplica */
export function derivedId(formData: FormData, suffix: string): string | undefined {
  const id = clientIdOf(formData);
  if (!id) return undefined;
  const h = createHash('sha1').update(id + ':' + suffix).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Inserta una fila; si ya existía con ese id (reintento) la ignora */
export async function insertOnce(supabase: any, table: string, row: Record<string, unknown>, id: string | undefined) {
  if (!id) return check(await supabase.from(table).insert(row));
  return check(await supabase.from(table).upsert({ ...row, id }, { onConflict: 'id', ignoreDuplicates: true }));
}

/** Momento real en que el usuario guardó el registro (puede ser anterior al envío si estaba sin señal) */
export function capturedAt(formData: FormData): string {
  const t = Date.parse(String(formData.get('capturedAt') || ''));
  if (Number.isNaN(t) || t > Date.now()) return new Date().toISOString();
  return new Date(t).toISOString();
}

/** Lanza el error de Supabase si lo hay, para que un fallo no pase como éxito silencioso */
export function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(res.error.message);
  return res;
}

/**
 * Ejecuta `fn` una sola vez por `clientId`. Si el celular reintenta un registro que
 * ya llegó, se ignora. Si `fn` falla, el recibo se borra para permitir el reintento.
 * Si la tabla sync_receipts aún no existe, ejecuta igual (sin protección contra duplicados).
 */
export async function runOnce(formData: FormData, fn: () => Promise<void>): Promise<void> {
  const clientId = clientIdOf(formData);
  if (!clientId) return fn();

  const supabase = createClient();
  const { error } = await supabase.from('sync_receipts').insert({ client_id: clientId });
  if (error?.code === '23505') return;

  try {
    await fn();
  } catch (e) {
    if (!error) await supabase.from('sync_receipts').delete().eq('client_id', clientId);
    throw e;
  }
}

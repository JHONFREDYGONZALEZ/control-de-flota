export type Status = 'expired' | 'warning' | 'ok' | 'pending';

export function statusPriority(s: Status) {
  return { expired: 3, warning: 2, pending: 1, ok: 0 }[s];
}
export function statusLabel(s: Status) {
  return { expired: 'Vencido', warning: 'Próximo', ok: 'Vigente', pending: 'Sin datos' }[s];
}

export function daysUntil(dateStr: string) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function docStatus(doc: { has_expiry: boolean; due_date: string | null; alert_days: number; file_url: string | null }): Status {
  if (!doc.has_expiry) return doc.file_url ? 'ok' : 'expired';
  if (!doc.due_date) return 'pending';
  const days = daysUntil(doc.due_date);
  if (days < 0) return 'expired';
  if (days <= (doc.alert_days || 30)) return 'warning';
  return 'ok';
}

export function maintStatus(item: { due_km: number | null; alert_km: number }, currentKm: number | null): Status {
  if (item.due_km == null) return 'pending';
  if (currentKm == null) return 'pending';
  const remaining = Number(item.due_km) - Number(currentKm);
  if (remaining < 0) return 'expired';
  if (remaining <= (item.alert_km || 2000)) return 'warning';
  return 'ok';
}

/** El viernes más reciente (hoy si es viernes) */
export function mostRecentFriday(base?: Date) {
  const d = base ? new Date(base) : new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=domingo ... 5=viernes
  const diff = (day - 5 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
export function kmFridayNeedsAlert(lastKmLogAt: string | null) {
  const lastFriday = mostRecentFriday();
  if (!lastKmLogAt) return true;
  const d = new Date(lastKmLogAt);
  d.setHours(0, 0, 0, 0);
  return d < lastFriday;
}

/** órdenes generadas antes del mes actual y aún sin facturar */
export function isOverdueUnbilled(createdAt: string) {
  const created = new Date(createdAt);
  const now = new Date();
  const createdYM = created.getFullYear() * 12 + created.getMonth();
  const nowYM = now.getFullYear() * 12 + now.getMonth();
  return createdYM < nowYM;
}

export type AlertItem = { name: string; status: Status; detail: string };

export function computeVehicleSummary(input: {
  documents: { name: string; has_expiry: boolean; due_date: string | null; alert_days: number; file_url: string | null }[];
  maintenance_items: { name: string; due_km: number | null; alert_km: number }[];
  work_orders: { maintenance_name: string; provider_name?: string; invoiced: boolean; created_at: string }[];
  current_km: number | null;
  last_km_log_at: string | null;
}) {
  let worst: Status = 'ok';
  let expiredCount = 0;
  let warningCount = 0;
  const alertItems: AlertItem[] = [];

  for (const d of input.documents) {
    const s = docStatus(d);
    if (s === 'expired' || s === 'warning') {
      let detail = '';
      if (d.has_expiry && d.due_date) {
        const days = daysUntil(d.due_date);
        detail = days < 0 ? `vencido hace ${Math.abs(days)}d` : `vence en ${days}d`;
      } else if (!d.has_expiry) {
        detail = 'sin archivo cargado';
      }
      alertItems.push({ name: d.name, status: s, detail });
    }
    if (s === 'expired') expiredCount++;
    if (s === 'warning') warningCount++;
    if (statusPriority(s) > statusPriority(worst)) worst = s;
  }

  for (const it of input.maintenance_items) {
    const s = maintStatus(it, input.current_km);
    if (s === 'expired' || s === 'warning') {
      let detail = '';
      if (it.due_km != null && input.current_km != null) {
        const rem = Number(it.due_km) - Number(input.current_km);
        detail = rem >= 0 ? `faltan ${rem.toLocaleString('es-CO')}km` : `excede ${Math.abs(rem).toLocaleString('es-CO')}km`;
      }
      alertItems.push({ name: it.name, status: s, detail });
    }
    if (s === 'expired') expiredCount++;
    if (s === 'warning') warningCount++;
    if (statusPriority(s) > statusPriority(worst)) worst = s;
  }

  if (kmFridayNeedsAlert(input.last_km_log_at)) {
    alertItems.push({ name: 'Kilometraje semanal', status: 'expired', detail: 'no se registró el viernes' });
    expiredCount++;
    worst = 'expired';
  }

  for (const o of input.work_orders) {
    if (!o.invoiced && isOverdueUnbilled(o.created_at)) {
      alertItems.push({ name: `Sin facturar: ${o.maintenance_name}`, status: 'expired', detail: `proveedor ${o.provider_name || ''}` });
      expiredCount++;
      worst = 'expired';
    }
  }

  alertItems.sort((a, b) => statusPriority(b.status) - statusPriority(a.status));
  return { worst, expiredCount, warningCount, alertItems };
}

export const DOC_TEMPLATES = [
  { name: 'SOAT', has_expiry: true, alert_days: 30 },
  { name: 'Seguro todo riesgo', has_expiry: true, alert_days: 30 },
  { name: 'Tecnomecánica', has_expiry: true, alert_days: 30 },
  { name: 'Tarjeta de propiedad', has_expiry: false, alert_days: 0 },
];
export const MAINT_TEMPLATES = [
  { name: 'Cambio de aceite', interval_km: 5000, alert_km: 2000 },
  { name: 'Cambio de pastillas de freno', interval_km: 20000, alert_km: 2000 },
  { name: 'Revisión de suspensión', interval_km: 20000, alert_km: 2000 },
  { name: 'Mant. preventivo aire acondicionado', interval_km: 10000, alert_km: 2000 },
  { name: 'Lavado', interval_km: 3000, alert_km: 800 },
];
export const DELIVERY_PHOTO_SLOTS = [
  { key: 'frontal', label: 'Foto frontal' },
  { key: 'derecho', label: 'Costado derecho' },
  { key: 'izquierdo', label: 'Costado izquierdo' },
  { key: 'atras', label: 'Atrás' },
  { key: 'torpedo', label: 'Torpedo' },
  { key: 'tacometro', label: 'Tacómetro' },
  { key: 'sillas', label: 'Interna sillas' },
  { key: 'herramienta', label: 'Juego de herramienta' },
  { key: 'kitCarretera', label: 'Kit de carretera' },
];

export function fmtKm(n: number | null) {
  return n == null ? '—' : Number(n).toLocaleString('es-CO') + ' km';
}
export function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

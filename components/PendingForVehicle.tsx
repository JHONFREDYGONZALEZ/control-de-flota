'use client';

import { useState, useSyncExternalStore } from 'react';
import { discardItem, getState, retryFailed, subscribe } from '@/lib/offline/sync';
import type { QueueItem } from '@/lib/offline/queue';

const EMPTY = { pending: [], failed: [], syncing: false, authRequired: false };

function field(item: QueueItem, name: string) {
  const v = item.fields.find(([k]) => k === name)?.[1];
  return typeof v === 'string' ? v : '';
}

function describe(item: QueueItem): string {
  switch (item.action) {
    case 'registerKm':
      return `Kilometraje: ${Number(field(item, 'km')).toLocaleString('es-CO')} km`;
    case 'generateWorkOrder':
    case 'generateWorkOrderFromDashboard':
    case 'updateWorkOrder': {
      const name = field(item, 'maintenanceName');
      const type = name === '__otro__' ? field(item, 'maintenanceOther') : name;
      return `${item.action === 'updateWorkOrder' ? 'Cambios en orden' : 'Orden de trabajo'}: ${type}`;
    }
    case 'addDelivery':
    case 'addDeliveryFromDashboard': {
      const photos = item.fields.filter(([k, v]) => k.startsWith('photo_') && typeof v !== 'string').length;
      return `Entrega a ${field(item, 'assignedTo')} (${photos} foto${photos === 1 ? '' : 's'})`;
    }
    case 'updateDeliveryPhotos':
      return 'Fotos de entrega reemplazadas';
    case 'updateMaintenanceItem':
      return `Mantenimiento: ${item.label.replace(/\s+[^\s]+$/, '')}`;
    case 'updateDocument':
      return `Documento: ${item.label.replace(/\s+[^\s]+$/, '')}`;
    case 'addCustomDocument':
      return `Documento nuevo: ${field(item, 'name')}`;
    case 'addCustomMaintenanceItem':
      return `Ítem de mantenimiento: ${field(item, 'name')}`;
    default:
      return item.label;
  }
}

export default function PendingForVehicle({ vehicleId }: { vehicleId: string }) {
  const state = useSyncExternalStore(subscribe, getState, () => EMPTY);
  const [, force] = useState(0);
  const items = [...state.failed, ...state.pending].filter((i) => field(i, 'vehicleId') === vehicleId);
  if (items.length === 0) return null;

  return (
    <div className="card mt-3 border-amber">
      <div className="flex justify-between items-center gap-2 mb-2">
        <h3 className="text-sm font-display">Pendientes de enviar ({items.length})</h3>
        {state.syncing && <span className="text-dim text-xs">Enviando…</span>}
      </div>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between items-start gap-2 text-xs">
            <div>
              <div className="font-semibold">{describe(i)}</div>
              <div className="text-dim">
                Guardado {new Date(i.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {i.status === 'failed' ? <span className="text-red">{i.error || 'no se pudo enviar'}</span> : 'en espera de señal'}
              </div>
            </div>
            {i.status === 'failed' && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  await discardItem(i.id);
                  force((n) => n + 1);
                }}
              >
                Descartar
              </button>
            )}
          </div>
        ))}
      </div>
      {state.failed.some((i) => field(i, 'vehicleId') === vehicleId) && (
        <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => void retryFailed()}>
          Reintentar
        </button>
      )}
    </div>
  );
}

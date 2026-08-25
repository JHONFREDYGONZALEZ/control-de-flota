'use client';

import { useState } from 'react';

export default function MaintenanceKmFields({
  lastKmDefault,
  intervalKmDefault,
}: {
  lastKmDefault: number | null;
  intervalKmDefault: number | null;
}) {
  const [lastKm, setLastKm] = useState<string>(lastKmDefault != null ? String(lastKmDefault) : '');
  const [intervalKm, setIntervalKm] = useState<string>(intervalKmDefault != null ? String(intervalKmDefault) : '');

  const dueKm = Number(lastKm || 0) + Number(intervalKm || 0);
  const dueKmDisplay = lastKm !== '' && intervalKm !== '' ? dueKm.toLocaleString('es-CO') : '—';

  return (
    <>
      <div className="field-row">
        <div className="field">
          <label>Km del mantenimiento</label>
          <input
            name="lastKm"
            type="number"
            min="0"
            value={lastKm}
            onChange={(e) => setLastKm(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Frecuencia en km</label>
          <input
            name="intervalKm"
            type="number"
            min="1"
            value={intervalKm}
            onChange={(e) => setIntervalKm(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Próximo mantenimiento (km) — se calcula solo</label>
        <input value={dueKmDisplay} readOnly disabled style={{ opacity: 0.7 }} />
        <input type="hidden" name="dueKm" value={lastKm !== '' && intervalKm !== '' ? dueKm : ''} />
      </div>
    </>
  );
}

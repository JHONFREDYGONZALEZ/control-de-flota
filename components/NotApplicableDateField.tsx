'use client';

import { useState } from 'react';

export default function NotApplicableDateField({
  notApplicableDefault,
  dueDateDefault,
}: {
  notApplicableDefault: boolean;
  dueDateDefault: string | null;
}) {
  const [na, setNa] = useState(notApplicableDefault);

  return (
    <>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          name="notApplicable"
          value="1"
          checked={na}
          onChange={(e) => setNa(e.target.checked)}
          style={{ width: 'auto' }}
        />
        <span style={{ fontSize: 12, color: 'var(--dim)' }}>No aplica a este vehículo</span>
      </label>
      {!na && (
        <div className="field">
          <label>Fecha de vencimiento</label>
          <input type="date" name="dueDate" defaultValue={dueDateDefault || ''} required />
        </div>
      )}
    </>
  );
}

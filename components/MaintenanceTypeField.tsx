'use client';

import { useState } from 'react';
import { MAINT_TEMPLATES } from '@/lib/fleet';

export default function MaintenanceTypeField({ defaultValue }: { defaultValue?: string }) {
  const isKnown = MAINT_TEMPLATES.some((t) => t.name === defaultValue);
  const [value, setValue] = useState(defaultValue && !isKnown ? '__otro__' : defaultValue || MAINT_TEMPLATES[0].name);

  return (
    <>
      <div className="field">
        <label>Tipo de mantenimiento</label>
        <select name="maintenanceName" value={value} onChange={(e) => setValue(e.target.value)}>
          {MAINT_TEMPLATES.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
          <option value="__otro__">Otro (especificar)</option>
        </select>
      </div>
      {value === '__otro__' && (
        <div className="field">
          <label>Especifica el tipo de mantenimiento</label>
          <input name="maintenanceOther" placeholder="Ej. cambio de batería" defaultValue={!isKnown ? defaultValue : ''} required autoFocus />
        </div>
      )}
    </>
  );
}

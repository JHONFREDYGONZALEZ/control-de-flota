'use client';

import { useState } from 'react';

export default function PhotoField({
  name,
  label,
  existingUrl,
  existingLabel = 'Ver foto actual',
}: {
  name: string;
  label: string;
  existingUrl?: string | null;
  existingLabel?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputId = `photo-${name}`;

  return (
    <div className="field">
      <label>{label}</label>
      <input
        id={inputId}
        type="file"
        name={name}
        accept="image/*"
        capture="environment"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
      />
      <label
        htmlFor={inputId}
        className="btn btn-sm"
        style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}
      >
        {fileName ? '✓ Foto lista' : existingUrl ? 'Tomar foto (reemplazar)' : 'Tomar foto'}
      </label>
      {existingUrl && !fileName && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-teal" style={{ fontSize: 11, display: 'inline-block', marginTop: 4 }}>
          {existingLabel}
        </a>
      )}
      {fileName && <div className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>{fileName}</div>}
    </div>
  );
}

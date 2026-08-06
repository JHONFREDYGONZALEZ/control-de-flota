'use client';

import { useState } from 'react';

export default function DocumentFileField({
  name = 'file',
  label = 'Archivo del documento (imagen o pdf)',
  existingUrl,
}: {
  name?: string;
  label?: string;
  existingUrl?: string | null;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputId = `docfile-${name}-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="field">
      <label>{label}</label>
      <input
        id={inputId}
        type="file"
        name={name}
        accept="image/*,.pdf"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
      />
      <label htmlFor={inputId} className="btn btn-sm" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
        {fileName ? '✓ Archivo listo' : existingUrl ? 'Cambiar archivo' : 'Subir archivo'}
      </label>
      {existingUrl && !fileName && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-teal" style={{ fontSize: 11, display: 'inline-block', marginTop: 4 }}>
          Ver archivo actual
        </a>
      )}
      {fileName && <div className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>{fileName}</div>}
    </div>
  );
}

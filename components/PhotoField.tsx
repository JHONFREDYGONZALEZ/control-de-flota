'use client';

import { useState } from 'react';
import { resizeImage } from '@/lib/image';

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
  const [busy, setBusy] = useState(false);
  const inputId = `photo-${name}`;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const original = input.files?.[0];
    if (!original) {
      setFileName(null);
      return;
    }
    setBusy(true);
    try {
      const compressed = await resizeImage(original);
      const dt = new DataTransfer();
      dt.items.add(compressed);
      input.files = dt.files;
      setFileName(compressed.name);
    } catch {
      setFileName(original.name);
    } finally {
      setBusy(false);
    }
  }

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
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        className="btn btn-sm"
        style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}
      >
        {busy ? 'Procesando…' : fileName ? '✓ Foto lista' : existingUrl ? 'Tomar foto (reemplazar)' : 'Tomar foto'}
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

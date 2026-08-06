'use client';

import { useState } from 'react';

function resizeImage(file: File, maxDim = 1400, quality = 0.75): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

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

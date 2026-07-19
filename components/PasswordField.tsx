'use client';

import { useState } from 'react';

export default function PasswordField({ name, label, minLength }: { name: string; label: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          required
          minLength={minLength}
          style={{ paddingRight: '3rem' }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="btn-ghost"
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px 10px',
            fontSize: '11px',
            minHeight: 'auto',
            border: 'none',
          }}
        >
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
    </div>
  );
}

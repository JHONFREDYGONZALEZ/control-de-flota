'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

export default function SaveFeedback({ message = 'Guardado' }: { message?: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (wasPending.current && !pending) {
      const details = anchorRef.current?.closest('details');
      if (details) details.removeAttribute('open');
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2600);
      wasPending.current = pending;
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <span ref={anchorRef} style={{ display: visible ? 'inline' : 'none' }}>
      {visible && (
        <span
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--teal)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,.18)',
          }}
        >
          ✓ {message}
        </span>
      )}
    </span>
  );
}

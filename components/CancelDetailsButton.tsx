'use client';

export default function CancelDetailsButton({ label = 'Cancelar' }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={(e) => {
        const details = (e.currentTarget as HTMLElement).closest('details');
        if (details) details.removeAttribute('open');
      }}
    >
      {label}
    </button>
  );
}

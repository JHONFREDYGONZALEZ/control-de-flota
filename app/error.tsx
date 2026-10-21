'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card text-center">
        <h2 className="font-display text-lg mb-2">No se pudo cargar esta pantalla</h2>
        <p className="text-dim text-sm mb-4">Revisa tu conexión e inténtalo de nuevo. Lo que ya registraste está a salvo.</p>
        <div className="flex gap-2 justify-center">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Reintentar
          </button>
          <a href="/dashboard" className="btn">
            Ir al panel
          </a>
        </div>
      </div>
    </div>
  );
}

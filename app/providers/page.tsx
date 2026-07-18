import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { addProvider, updateProvider, removeProvider } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .eq('company_id', profile!.company_id)
    .order('name');
  const isAdmin = profile!.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
        ← Volver
      </Link>
      <h2 className="font-display text-xl mb-4">Proveedores</h2>

      {(providers || []).length === 0 && <div className="card text-center text-dim">Aún no hay proveedores registrados.</div>}

      {(providers || []).map((p) => (
        <div key={p.id} className="card flex justify-between items-start mb-2.5">
          <div>
            <div className="font-semibold text-sm">{p.name}</div>
            <div className="text-dim text-xs mt-1">
              {p.specialty || 'sin especialidad registrada'}
              {p.phone ? ` · ${p.phone}` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <details>
              <summary className="btn btn-sm cursor-pointer list-none">Editar</summary>
              <form action={updateProvider} className="mt-2 space-y-2 w-64">
                <input type="hidden" name="providerId" value={p.id} />
                <input name="name" defaultValue={p.name} required className="field" />
                <input name="specialty" defaultValue={p.specialty || ''} placeholder="Especialidad" />
                <input name="phone" defaultValue={p.phone || ''} placeholder="Teléfono" />
                <button type="submit" className="btn btn-primary btn-sm w-full">
                  Guardar
                </button>
              </form>
            </details>
            {isAdmin && (
              <form action={removeProvider}>
                <input type="hidden" name="providerId" value={p.id} />
                <button className="btn btn-sm btn-danger">Eliminar</button>
              </form>
            )}
          </div>
        </div>
      ))}

      <details className="mt-4">
        <summary className="btn btn-primary cursor-pointer list-none">+ Agregar proveedor</summary>
        <form action={addProvider} className="card mt-2 space-y-3">
          <div className="field">
            <label>Nombre del proveedor</label>
            <input name="name" required autoFocus />
          </div>
          <div className="field">
            <label>Especialidad</label>
            <input name="specialty" placeholder="Ej. cambio de aceite y frenos" />
          </div>
          <div className="field">
            <label>Teléfono (para WhatsApp)</label>
            <input name="phone" placeholder="Ej. 3214535910" />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Guardar
          </button>
        </form>
      </details>
    </div>
  );
}

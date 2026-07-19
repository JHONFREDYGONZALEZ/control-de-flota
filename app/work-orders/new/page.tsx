import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MAINT_TEMPLATES } from '@/lib/fleet';
import { generateWorkOrderFromDashboard } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewWorkOrderPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { data: vehicles } = await supabase.from('vehicles').select('id, placa, marca, modelo').eq('company_id', profile!.company_id).order('placa');
  const { data: providers } = await supabase.from('providers').select('*').eq('company_id', profile!.company_id).order('name');

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
        ← Volver
      </Link>
      <h2 className="font-display text-xl mb-4">Generar orden de trabajo</h2>

      {(providers || []).length === 0 ? (
        <div className="card text-center text-dim text-sm">
          Aún no tienes proveedores registrados.{' '}
          <Link href="/providers" className="text-teal">
            Crea uno primero
          </Link>
          .
        </div>
      ) : (
        <form action={generateWorkOrderFromDashboard} className="card space-y-3">
          <div className="field">
            <label>Vehículo</label>
            <select name="vehicleId" required autoFocus>
              <option value="">Selecciona un vehículo</option>
              {(vehicles || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipo de mantenimiento</label>
            <select name="maintenanceName">
              {MAINT_TEMPLATES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
              <option value="__otro__">Otro (especificar)</option>
            </select>
          </div>
          <div className="field">
            <label>Otro (si aplica)</label>
            <input name="maintenanceOther" placeholder="Ej. cambio de batería" />
          </div>
          <div className="field">
            <label>Proveedor</label>
            <select name="providerId" required>
              <option value="">Selecciona un proveedor</option>
              {providers!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.specialty ? ` — ${p.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Instrucciones / notas</label>
            <textarea name="notes" rows={3} placeholder="Detalles adicionales para el proveedor" />
          </div>
          <div className="flex gap-2 pt-2">
            <Link href="/dashboard" className="btn btn-ghost flex-1 text-center">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary flex-1">
              Generar orden
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

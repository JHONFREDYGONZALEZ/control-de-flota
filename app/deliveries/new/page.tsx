import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DELIVERY_PHOTO_SLOTS } from '@/lib/fleet';
import { addDeliveryFromDashboard } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewDeliveryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { data: vehicles } = await supabase.from('vehicles').select('id, placa, marca, modelo').eq('company_id', profile!.company_id).order('placa');

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
        ← Volver
      </Link>
      <h2 className="font-display text-xl mb-4">Registrar entrega</h2>
      <form action={addDeliveryFromDashboard} className="card space-y-3" encType="multipart/form-data">
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
          <label>Persona asignada</label>
          <input name="assignedTo" required />
        </div>
        <div className="field">
          <label>Fecha de entrega</label>
          <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="field">
          <label>Notas</label>
          <textarea name="notes" rows={2} />
        </div>
        <p className="text-dim text-xs">Fotos de entrega (se toman con la cámara del celular):</p>
        <div className="grid grid-cols-2 gap-2">
          {DELIVERY_PHOTO_SLOTS.map((s) => (
            <div className="field" key={s.key}>
              <label>{s.label}</label>
              <input type="file" name={`photo_${s.key}`} accept="image/*" capture="environment" />
            </div>
          ))}
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Guardar
        </button>
      </form>
    </div>
  );
}

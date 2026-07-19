'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DOC_TEMPLATES, MAINT_TEMPLATES } from '@/lib/fleet';

export async function addVehicleFromDashboard(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');

  const placa = String(formData.get('placa') || '').toUpperCase().trim();
  const marca = String(formData.get('marca') || '').trim();
  const modelo = String(formData.get('modelo') || '').trim();
  const anio = formData.get('anio') ? Number(formData.get('anio')) : null;
  const kmInicial = formData.get('kmInicial') ? Number(formData.get('kmInicial')) : null;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert({ company_id: profile.company_id, placa, marca, modelo, anio, current_km: kmInicial })
    .select()
    .single();
  if (error || !vehicle) throw new Error(error?.message || 'No se pudo crear el vehículo');

  await supabase.from('documents').insert(
    DOC_TEMPLATES.map((t) => ({ vehicle_id: vehicle.id, name: t.name, has_expiry: t.has_expiry, alert_days: t.alert_days }))
  );
  await supabase.from('maintenance_items').insert(
    MAINT_TEMPLATES.map((t) => ({ vehicle_id: vehicle.id, name: t.name, interval_km: t.interval_km, alert_km: t.alert_km }))
  );
  if (kmInicial != null) {
    await supabase.from('km_logs').insert({ vehicle_id: vehicle.id, km: kmInicial, logged_by: profile.id });
  }

  redirect(`/vehicles/${vehicle.id}`);
}

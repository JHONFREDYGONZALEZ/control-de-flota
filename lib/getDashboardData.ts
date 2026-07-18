import { createClient } from '@/lib/supabase/server';
import { computeVehicleSummary } from '@/lib/fleet';

export async function getDashboardData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase.from('profiles').select('*, companies(name)').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(
      `id, placa, marca, modelo, anio, current_km,
       documents(id, name, has_expiry, due_date, alert_days, file_url),
       maintenance_items(id, name, due_km, alert_km),
       work_orders(id, maintenance_name, notes, value, approved, invoiced, invoice_number, created_at, providers(id, name, phone))`
    )
    .eq('company_id', profile.company_id)
    .order('placa');

  const { data: observations } = await supabase
    .from('observations')
    .select('id, text, obs_date, created_at, vehicles(id, placa)')
    .in('vehicle_id', (vehicles || []).map((v) => v.id))
    .order('created_at', { ascending: false });

  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name');

  const vehiclesWithSummary = await Promise.all(
    (vehicles || []).map(async (v) => {
      const { data: lastLog } = await supabase
        .from('km_logs')
        .select('created_at')
        .eq('vehicle_id', v.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const workOrders = (v.work_orders || []).map((o: any) => ({
        ...o,
        provider_name: o.providers?.name,
        provider_phone: o.providers?.phone,
      }));

      const summary = computeVehicleSummary({
        documents: v.documents || [],
        maintenance_items: v.maintenance_items || [],
        work_orders: workOrders,
        current_km: v.current_km,
        last_km_log_at: lastLog?.created_at || null,
      });

      return { ...v, work_orders: workOrders, summary };
    })
  );

  const allWorkOrders = vehiclesWithSummary
    .flatMap((v) => (v.work_orders || []).map((o: any) => ({ ...o, vehicle: { id: v.id, placa: v.placa } })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { profile, vehicles: vehiclesWithSummary, observations: observations || [], providers: providers || [], allWorkOrders };
}

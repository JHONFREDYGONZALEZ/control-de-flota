import { createClient } from '@/lib/supabase/server';
import { computeVehicleSummary, mostRecentFriday } from '@/lib/fleet';

export async function getDashboardData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabase.from('profiles').select('*, companies(name)').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');

  // solo importa saber si hubo kilometraje desde el último viernes: se trae esa semana, no todo el historial
  const sinceFriday = mostRecentFriday().toISOString();

  const [{ data: vehicles }, { data: observations }, { data: recentKmLogs }] = await Promise.all([
    supabase
      .from('vehicles')
      .select(
        `id, placa, marca, modelo, anio, current_km,
         documents(id, name, has_expiry, due_date, alert_days, file_url, not_applicable),
         maintenance_items(id, name, due_km, alert_km),
         work_orders(id, maintenance_name, notes, value, approved, invoiced, invoice_number, created_at, providers(id, name, phone))`
      )
      .eq('company_id', profile.company_id)
      .order('placa'),
    supabase
      .from('observations')
      .select('id, text, obs_date, created_at, vehicles!inner(id, placa, company_id)')
      .eq('vehicles.company_id', profile.company_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('km_logs')
      .select('vehicle_id, created_at, vehicles!inner(company_id)')
      .eq('vehicles.company_id', profile.company_id)
      .gte('created_at', sinceFriday)
      .order('created_at', { ascending: false }),
  ]);

  const lastKmLogAt = new Map<string, string>();
  for (const log of recentKmLogs || []) {
    if (!lastKmLogAt.has(log.vehicle_id)) lastKmLogAt.set(log.vehicle_id, log.created_at);
  }

  const vehiclesWithSummary = (vehicles || []).map((v) => {
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
      last_km_log_at: lastKmLogAt.get(v.id) || null,
    });

    return { ...v, work_orders: workOrders, summary };
  });

  const allWorkOrders = vehiclesWithSummary
    .flatMap((v) => (v.work_orders || []).map((o: any) => ({ ...o, vehicle: { id: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio, current_km: v.current_km } })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { profile, vehicles: vehiclesWithSummary, observations: observations || [], allWorkOrders };
}

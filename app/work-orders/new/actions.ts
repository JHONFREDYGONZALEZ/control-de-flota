'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { runOnce, capturedAt, check } from '@/lib/idempotent';

export async function generateWorkOrderFromDashboard(formData: FormData) {
  await runOnce(formData, async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (!profile) throw new Error('Perfil no encontrado');

    const vehicleId = String(formData.get('vehicleId') || '');
    if (!vehicleId) throw new Error('Selecciona un vehículo');
    const providerId = String(formData.get('providerId') || '');
    if (!providerId) throw new Error('Selecciona un proveedor');
    const rawName = String(formData.get('maintenanceName'));
    const maintenanceName = rawName === '__otro__' ? String(formData.get('maintenanceOther') || '').trim() : rawName;
    if (!maintenanceName) throw new Error('Especifica el tipo de mantenimiento');

    check(
      await supabase.from('work_orders').insert({
        vehicle_id: vehicleId,
        provider_id: providerId,
        maintenance_name: maintenanceName,
        notes: String(formData.get('notes') || '') || null,
        created_by: profile.id,
        created_at: capturedAt(formData),
      })
    );

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/dashboard');
  });
}

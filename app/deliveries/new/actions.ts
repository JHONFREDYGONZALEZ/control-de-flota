'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { runOnce } from '@/lib/idempotent';
import { createDeliveryWithPhotos } from '@/lib/deliveries';

export async function addDeliveryFromDashboard(formData: FormData) {
  await runOnce(formData, async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (!profile) throw new Error('Perfil no encontrado');

    const vehicleId = String(formData.get('vehicleId') || '');
    if (!vehicleId) throw new Error('Selecciona un vehículo');

    await createDeliveryWithPhotos(supabase, profile.id, formData, vehicleId);
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/dashboard');
  });
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DELIVERY_PHOTO_SLOTS } from '@/lib/fleet';

export async function addDeliveryFromDashboard(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

  const vehicleId = String(formData.get('vehicleId'));
  if (!vehicleId) throw new Error('Selecciona un vehículo');

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert({
      vehicle_id: vehicleId,
      assigned_to: String(formData.get('assignedTo') || '').trim(),
      delivery_date: String(formData.get('date') || new Date().toISOString().slice(0, 10)),
      notes: String(formData.get('notes') || '') || null,
      created_by: profile!.id,
    })
    .select()
    .single();
  if (error || !delivery) throw new Error(error?.message || 'No se pudo registrar la entrega');

  for (const slot of DELIVERY_PHOTO_SLOTS) {
    const file = formData.get(`photo_${slot.key}`);
    if (file instanceof File && file.size > 0) {
      const ext = file.name.split('.').pop();
      const path = `deliveries/${delivery.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('fleet-files').upload(path, file);
      if (!upErr) {
        const { data } = supabase.storage.from('fleet-files').getPublicUrl(path);
        await supabase.from('delivery_photos').insert({ delivery_id: delivery.id, slot: slot.key, photo_url: data.publicUrl });
      }
    }
  }

  redirect(`/vehicles/${vehicleId}`);
}

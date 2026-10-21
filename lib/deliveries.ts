import { DELIVERY_PHOTO_SLOTS } from '@/lib/fleet';
import { capturedAt, check, clientIdOf } from '@/lib/idempotent';
import { uploadIfPresent } from '@/lib/storage';

/**
 * Crea una entrega con sus fotos. Si el envío se corta a la mitad (señal débil), el reintento
 * reutiliza la misma entrega (su id es el clientId) y solo sube las fotos que faltan.
 */
export async function createDeliveryWithPhotos(supabase: any, userId: string, formData: FormData, vehicleId: string) {
  const clientId = clientIdOf(formData);
  const row = {
    ...(clientId ? { id: clientId } : {}),
    vehicle_id: vehicleId,
    assigned_to: String(formData.get('assignedTo') || '').trim(),
    delivery_date: String(formData.get('date') || capturedAt(formData).slice(0, 10)),
    notes: String(formData.get('notes') || '') || null,
    created_by: userId,
    created_at: capturedAt(formData),
  };

  let deliveryId: string;
  const { data: created, error } = await supabase.from('deliveries').insert(row).select('id').single();
  if (error?.code === '23505' && clientId) {
    deliveryId = clientId;
  } else {
    check({ error });
    deliveryId = created.id;
  }

  const { data: existing } = await supabase.from('delivery_photos').select('slot').eq('delivery_id', deliveryId);
  const done = new Set((existing || []).map((p: any) => p.slot));

  for (const slot of DELIVERY_PHOTO_SLOTS) {
    if (done.has(slot.key)) continue;
    const url = await uploadIfPresent(supabase, formData.get(`photo_${slot.key}`), `deliveries/${deliveryId}`);
    if (url) check(await supabase.from('delivery_photos').insert({ delivery_id: deliveryId, slot: slot.key, photo_url: url }));
  }
}

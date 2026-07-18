'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DELIVERY_PHOTO_SLOTS } from '@/lib/fleet';

async function currentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');
  return { supabase, profile };
}

async function uploadIfPresent(supabase: any, file: FormDataEntryValue | null, folder: string) {
  if (!file || !(file instanceof File) || file.size === 0) return null;
  const ext = file.name.split('.').pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('fleet-files').upload(path, file, { upsert: false });
  if (error) throw new Error('No se pudo subir el archivo: ' + error.message);
  const { data } = supabase.storage.from('fleet-files').getPublicUrl(path);
  return data.publicUrl as string;
}

export async function updateDocument(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const documentId = String(formData.get('documentId'));
  const vehicleId = String(formData.get('vehicleId'));
  const hasExpiry = formData.get('hasExpiry') === '1';
  const dueDate = hasExpiry ? String(formData.get('dueDate') || '') || null : null;
  const owner = String(formData.get('owner') || '') || null;
  const note = String(formData.get('note') || '') || null;
  const fileUrl = await uploadIfPresent(supabase, formData.get('file'), `documents/${vehicleId}`);

  const update: Record<string, unknown> = { note, owner };
  if (hasExpiry) update.due_date = dueDate;
  if (fileUrl) update.file_url = fileUrl;

  await supabase.from('documents').update(update).eq('id', documentId);
  await supabase.from('document_history').insert({
    document_id: documentId,
    due_date: dueDate,
    file_url: fileUrl,
    note,
    owner,
    created_by: profile.id,
  });
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath('/dashboard');
}

export async function addCustomDocument(formData: FormData) {
  const vehicleId = String(formData.get('vehicleId'));
  const { supabase } = await currentProfile();
  const dueDate = String(formData.get('dueDate') || '') || null;
  await supabase.from('documents').insert({
    vehicle_id: vehicleId,
    name: String(formData.get('name') || '').trim(),
    is_custom: true,
    has_expiry: !!dueDate,
    due_date: dueDate,
    alert_days: formData.get('alertDays') ? Number(formData.get('alertDays')) : 30,
  });
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateMaintenanceItem(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const itemId = String(formData.get('itemId'));
  const vehicleId = String(formData.get('vehicleId'));
  const lastKm = formData.get('lastKm') ? Number(formData.get('lastKm')) : null;
  const dueKm = formData.get('dueKm') ? Number(formData.get('dueKm')) : null;
  const intervalKm = formData.get('intervalKm') ? Number(formData.get('intervalKm')) : null;
  const alertKm = formData.get('alertKm') ? Number(formData.get('alertKm')) : 2000;
  const details = String(formData.get('details') || '') || null;
  const photoUrl = await uploadIfPresent(supabase, formData.get('photo'), `maintenance/${vehicleId}`);

  await supabase.from('maintenance_items').update({ last_km: lastKm, due_km: dueKm, interval_km: intervalKm, alert_km: alertKm }).eq('id', itemId);
  await supabase.from('maintenance_history').insert({
    maintenance_item_id: itemId,
    km: lastKm,
    due_km: dueKm,
    details,
    photo_url: photoUrl,
    created_by: profile.id,
  });

  // si el km reportado es mayor al actual del vehículo, actualiza el odómetro también
  const { data: vehicle } = await supabase.from('vehicles').select('current_km').eq('id', vehicleId).single();
  if (lastKm != null && (vehicle?.current_km == null || lastKm > vehicle.current_km)) {
    await supabase.from('vehicles').update({ current_km: lastKm }).eq('id', vehicleId);
    await supabase.from('km_logs').insert({ vehicle_id: vehicleId, km: lastKm, logged_by: profile.id });
  }

  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath('/dashboard');
}

export async function addCustomMaintenanceItem(formData: FormData) {
  const vehicleId = String(formData.get('vehicleId'));
  const { supabase } = await currentProfile();
  await supabase.from('maintenance_items').insert({
    vehicle_id: vehicleId,
    name: String(formData.get('name') || '').trim(),
    is_custom: true,
    interval_km: formData.get('intervalKm') ? Number(formData.get('intervalKm')) : null,
    alert_km: formData.get('alertKm') ? Number(formData.get('alertKm')) : 2000,
    last_km: formData.get('lastKm') ? Number(formData.get('lastKm')) : null,
    due_km: formData.get('dueKm') ? Number(formData.get('dueKm')) : null,
  });
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function addDelivery(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const vehicleId = String(formData.get('vehicleId'));

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert({
      vehicle_id: vehicleId,
      assigned_to: String(formData.get('assignedTo') || '').trim(),
      delivery_date: String(formData.get('date') || new Date().toISOString().slice(0, 10)),
      notes: String(formData.get('notes') || '') || null,
      created_by: profile.id,
    })
    .select()
    .single();
  if (error || !delivery) throw new Error(error?.message || 'No se pudo registrar la entrega');

  for (const slot of DELIVERY_PHOTO_SLOTS) {
    const url = await uploadIfPresent(supabase, formData.get(`photo_${slot.key}`), `deliveries/${delivery.id}`);
    if (url) {
      await supabase.from('delivery_photos').insert({ delivery_id: delivery.id, slot: slot.key, photo_url: url });
    }
  }

  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath('/dashboard');
}

export async function deleteVehicle(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede eliminar vehículos');
  await supabase.from('vehicles').delete().eq('id', String(formData.get('vehicleId')));
  revalidatePath('/dashboard');
}

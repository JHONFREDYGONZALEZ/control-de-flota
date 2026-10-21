'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DELIVERY_PHOTO_SLOTS, toTitleCase } from '@/lib/fleet';
import { runOnce, capturedAt, check, derivedId, insertOnce } from '@/lib/idempotent';
import { uploadIfPresent, deleteOldFile } from '@/lib/storage';
import { createDeliveryWithPhotos } from '@/lib/deliveries';

async function currentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');
  return { supabase, profile };
}

export async function updateDocument(formData: FormData) {
  await runOnce(formData, async () => {
    const { supabase, profile } = await currentProfile();
    const documentId = String(formData.get('documentId'));
    const vehicleId = String(formData.get('vehicleId'));
    const hasExpiry = formData.get('hasExpiry') === '1';
    const notApplicable = formData.get('notApplicable') === '1';
    const dueDate = hasExpiry && !notApplicable ? String(formData.get('dueDate') || '') || null : null;
    const owner = String(formData.get('owner') || '') || null;
    const fileUrl = await uploadIfPresent(supabase, formData.get('file'), `documents/${vehicleId}`);

    const update: Record<string, unknown> = { owner, not_applicable: notApplicable };
    if (hasExpiry) update.due_date = dueDate;

    if (fileUrl) {
      const { data: current } = await supabase.from('documents').select('file_url').eq('id', documentId).single();
      await deleteOldFile(supabase, current?.file_url || null);
      update.file_url = fileUrl;
    }

    check(await supabase.from('documents').update(update).eq('id', documentId));
    await insertOnce(
      supabase,
      'document_history',
      { document_id: documentId, due_date: dueDate, file_url: fileUrl, owner, created_by: profile.id, created_at: capturedAt(formData) },
      derivedId(formData, 'hist')
    );
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/dashboard');
  });
}

export async function addCustomDocument(formData: FormData) {
  await runOnce(formData, async () => {
    const vehicleId = String(formData.get('vehicleId'));
    const { supabase } = await currentProfile();
    const dueDate = String(formData.get('dueDate') || '') || null;
    check(
      await supabase.from('documents').insert({
        vehicle_id: vehicleId,
        name: String(formData.get('name') || '').trim(),
        is_custom: true,
        has_expiry: !!dueDate,
        due_date: dueDate,
        alert_days: formData.get('alertDays') ? Number(formData.get('alertDays')) : 30,
      })
    );
    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function updateMaintenanceItem(formData: FormData) {
  await runOnce(formData, async () => {
    const { supabase, profile } = await currentProfile();
    const itemId = String(formData.get('itemId'));
    const vehicleId = String(formData.get('vehicleId'));
    const when = capturedAt(formData);
    const lastKm = formData.get('lastKm') ? Number(formData.get('lastKm')) : null;
    const dueKm = formData.get('dueKm') ? Number(formData.get('dueKm')) : null;
    const intervalKm = formData.get('intervalKm') ? Number(formData.get('intervalKm')) : null;
    const alertKm = formData.get('alertKm') ? Number(formData.get('alertKm')) : 2000;
    const details = String(formData.get('details') || '') || null;
    const photoUrl = await uploadIfPresent(supabase, formData.get('photo'), `maintenance/${vehicleId}`);

    check(await supabase.from('maintenance_items').update({ last_km: lastKm, due_km: dueKm, interval_km: intervalKm, alert_km: alertKm }).eq('id', itemId));
    await insertOnce(
      supabase,
      'maintenance_history',
      { maintenance_item_id: itemId, km: lastKm, due_km: dueKm, details, photo_url: photoUrl, created_by: profile.id, created_at: when },
      derivedId(formData, 'hist')
    );

    // si el km reportado es mayor al actual del vehículo, actualiza el odómetro también
    const { data: vehicle } = await supabase.from('vehicles').select('current_km').eq('id', vehicleId).single();
    if (lastKm != null && (vehicle?.current_km == null || lastKm > vehicle.current_km)) {
      check(await supabase.from('vehicles').update({ current_km: lastKm }).eq('id', vehicleId));
      await insertOnce(supabase, 'km_logs', { vehicle_id: vehicleId, km: lastKm, logged_by: profile.id, created_at: when }, derivedId(formData, 'km'));
    }

    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/dashboard');
  });
}

export async function addCustomMaintenanceItem(formData: FormData) {
  await runOnce(formData, async () => {
    const vehicleId = String(formData.get('vehicleId'));
    const { supabase } = await currentProfile();
    check(
      await supabase.from('maintenance_items').insert({
        vehicle_id: vehicleId,
        name: String(formData.get('name') || '').trim(),
        is_custom: true,
        interval_km: formData.get('intervalKm') ? Number(formData.get('intervalKm')) : null,
        alert_km: formData.get('alertKm') ? Number(formData.get('alertKm')) : 2000,
        last_km: formData.get('lastKm') ? Number(formData.get('lastKm')) : null,
        due_km: formData.get('dueKm') ? Number(formData.get('dueKm')) : null,
      })
    );
    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function addDelivery(formData: FormData) {
  await runOnce(formData, async () => {
    const { supabase, profile } = await currentProfile();
    const vehicleId = String(formData.get('vehicleId'));
    await createDeliveryWithPhotos(supabase, profile.id, formData, vehicleId);
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/dashboard');
  });
}

export async function updateDeliveryPhotos(formData: FormData) {
  await runOnce(formData, async () => {
    const { supabase } = await currentProfile();
    const vehicleId = String(formData.get('vehicleId'));
    const deliveryId = String(formData.get('deliveryId'));

    const { data: existing } = await supabase.from('delivery_photos').select('*').eq('delivery_id', deliveryId);

    for (const slot of DELIVERY_PHOTO_SLOTS) {
      const file = formData.get(`photo_${slot.key}`);
      if (!(file instanceof File) || file.size === 0) continue;
      const url = await uploadIfPresent(supabase, file, `deliveries/${deliveryId}`);
      if (!url) continue;
      const current = (existing || []).find((p: any) => p.slot === slot.key);
      if (current) {
        await deleteOldFile(supabase, current.photo_url);
        check(await supabase.from('delivery_photos').update({ photo_url: url }).eq('id', current.id));
      } else {
        check(await supabase.from('delivery_photos').insert({ delivery_id: deliveryId, slot: slot.key, photo_url: url }));
      }
    }

    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function updateVehicleInfo(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede modificar los datos del vehículo');
  const vehicleId = String(formData.get('vehicleId'));
  const placa = String(formData.get('placa') || '').toUpperCase().trim();
  const marca = toTitleCase(String(formData.get('marca') || ''));
  const modelo = toTitleCase(String(formData.get('modelo') || ''));
  const anio = formData.get('anio') ? Number(formData.get('anio')) : null;

  if (!placa || !marca || !modelo) throw new Error('Completa placa, marca y modelo');

  await supabase.from('vehicles').update({ placa, marca, modelo, anio }).eq('id', vehicleId);
  revalidatePath(`/vehicles/${vehicleId}`);
  revalidatePath('/dashboard');
}

export async function deleteVehicle(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede eliminar vehículos');
  await supabase.from('vehicles').delete().eq('id', String(formData.get('vehicleId')));
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

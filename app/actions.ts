'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { DOC_TEMPLATES, MAINT_TEMPLATES, kmFridayNeedsAlert, mostRecentFriday, fmtDate, toTitleCase } from '@/lib/fleet';
import { sendPushToSubscriptions } from '@/lib/webpush';

async function currentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');
  return { supabase, user, profile };
}

async function notifyGerenciaNewWorkOrder(companyId: string, maintenanceName: string, placa: string) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  const admin = createAdminClient();
  const { data: gerentes } = await admin.from('profiles').select('id').eq('company_id', companyId).eq('role', 'gerencia');
  if (!gerentes || gerentes.length === 0) return;

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', gerentes.map((g) => g.id));
  if (!subs || subs.length === 0) return;

  await sendPushToSubscriptions(
    subs,
    {
      title: 'Nueva orden de trabajo por aprobar',
      body: `${placa ? placa + ' — ' : ''}${maintenanceName}`,
      url: '/dashboard',
    },
    (id) => {
      admin.from('push_subscriptions').delete().eq('id', id);
    }
  );
}

export async function addVehicle(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede agregar vehículos');
  const placa = String(formData.get('placa') || '').toUpperCase().trim();
  const marca = toTitleCase(String(formData.get('marca') || ''));
  const modelo = toTitleCase(String(formData.get('modelo') || ''));
  const anio = formData.get('anio') ? Number(formData.get('anio')) : null;
  const kmInicial = formData.get('kmInicial') ? Number(formData.get('kmInicial')) : null;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert({ company_id: profile.company_id, placa, marca, modelo, anio, current_km: kmInicial })
    .select()
    .single();
  if (error || !vehicle) throw new Error(error?.message || 'No se pudo crear el vehículo');

  await supabase.from('documents').insert(
    DOC_TEMPLATES.map((t) => ({
      vehicle_id: vehicle.id,
      name: t.name,
      has_expiry: t.has_expiry,
      alert_days: t.alert_days,
    }))
  );
  await supabase.from('maintenance_items').insert(
    MAINT_TEMPLATES.map((t) => ({
      vehicle_id: vehicle.id,
      name: t.name,
      interval_km: t.interval_km,
      alert_km: t.alert_km,
    }))
  );
  if (kmInicial != null) {
    await supabase.from('km_logs').insert({ vehicle_id: vehicle.id, km: kmInicial, logged_by: profile.id });
  }
  revalidatePath('/dashboard');
}

export async function registerKm(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const vehicleId = String(formData.get('vehicleId'));
  const km = Number(formData.get('km'));

  const { data: lastLog } = await supabase
    .from('km_logs')
    .select('created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (kmFridayNeedsAlert(lastLog?.created_at || null)) {
    const friday = mostRecentFriday();
    await supabase.from('observations').insert({
      vehicle_id: vehicleId,
      text: `El kilometraje se registró el ${fmtDate(new Date().toISOString().slice(0, 10))}, posterior al viernes ${fmtDate(friday.toISOString().slice(0, 10))}.`,
      created_by: profile.id,
    });
  }

  await supabase.from('km_logs').insert({ vehicle_id: vehicleId, km, logged_by: profile.id });
  await supabase.from('vehicles').update({ current_km: km }).eq('id', vehicleId);
  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deleteObservation(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede borrar observaciones');
  await supabase.from('observations').delete().eq('id', String(formData.get('observationId')));
  revalidatePath('/dashboard');
}

export async function addProvider(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  await supabase.from('providers').insert({
    company_id: profile.company_id,
    name: String(formData.get('name') || '').trim(),
    specialty: String(formData.get('specialty') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
  });
  revalidatePath('/dashboard');
  revalidatePath('/providers');
}

export async function generateWorkOrder(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const vehicleId = String(formData.get('vehicleId'));
  const providerId = String(formData.get('providerId'));
  const rawName = String(formData.get('maintenanceName'));
  const maintenanceName = rawName === '__otro__' ? String(formData.get('maintenanceOther') || '').trim() : rawName;
  if (!maintenanceName) throw new Error('Especifica el tipo de mantenimiento');

  const { data: vehicle } = await supabase.from('vehicles').select('placa').eq('id', vehicleId).single();

  await supabase.from('work_orders').insert({
    vehicle_id: vehicleId,
    provider_id: providerId,
    maintenance_name: maintenanceName,
    notes: String(formData.get('notes') || '') || null,
    created_by: profile.id,
  });
  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${vehicleId}`);

  try {
    await notifyGerenciaNewWorkOrder(profile.company_id, maintenanceName, vehicle?.placa || '');
  } catch {
    // si falla el envío de la notificación, no debe romper la creación de la orden
  }
}

export async function updateWorkOrder(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const orderId = String(formData.get('orderId'));
  const vehicleId = String(formData.get('vehicleId'));

  const { data: order } = await supabase.from('work_orders').select('approved').eq('id', orderId).single();
  if (order?.approved && profile.role !== 'admin' && profile.role !== 'gerencia') {
    throw new Error('Esta orden ya fue aprobada; solo gerencia o un administrador pueden modificarla');
  }

  const providerId = String(formData.get('providerId'));
  const rawName = String(formData.get('maintenanceName'));
  const maintenanceName = rawName === '__otro__' ? String(formData.get('maintenanceOther') || '').trim() : rawName;
  if (!maintenanceName) throw new Error('Especifica el tipo de mantenimiento');

  await supabase
    .from('work_orders')
    .update({
      provider_id: providerId,
      maintenance_name: maintenanceName,
      notes: String(formData.get('notes') || '') || null,
    })
    .eq('id', orderId);

  revalidatePath('/dashboard');
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deleteWorkOrder(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const orderId = String(formData.get('orderId'));

  const { data: order } = await supabase.from('work_orders').select('approved').eq('id', orderId).single();
  if (order?.approved && profile.role !== 'admin' && profile.role !== 'gerencia') {
    throw new Error('Esta orden ya fue aprobada; solo gerencia o un administrador pueden eliminarla');
  }

  await supabase.from('work_orders').delete().eq('id', orderId);
  revalidatePath('/dashboard');
}

export async function approveWorkOrder(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin' && profile.role !== 'gerencia') {
    throw new Error('Solo gerencia o un administrador pueden aprobar la orden');
  }
  const orderId = String(formData.get('orderId'));
  await supabase
    .from('work_orders')
    .update({ approved: true, approved_by: profile.id, approved_at: new Date().toISOString() })
    .eq('id', orderId);
  revalidatePath('/dashboard');
}

export async function invoiceWorkOrder(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  const orderId = String(formData.get('orderId'));
  const invoiceNumber = String(formData.get('invoiceNumber') || '').trim();
  const value = formData.get('value') ? Number(formData.get('value')) : null;
  if (!invoiceNumber) throw new Error('Escribe el número de factura');
  if (value == null) throw new Error('Escribe el valor del servicio');

  await supabase
    .from('work_orders')
    .update({
      invoiced: true,
      invoice_number: invoiceNumber,
      value,
      invoiced_by: profile.id,
      invoiced_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  revalidatePath('/dashboard');
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function currentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');
  return { supabase, profile };
}

export async function addProvider(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  await supabase.from('providers').insert({
    company_id: profile.company_id,
    name: String(formData.get('name') || '').trim(),
    specialty: String(formData.get('specialty') || '').trim() || null,
    phone: String(formData.get('phone') || '').trim() || null,
  });
  revalidatePath('/providers');
}

export async function updateProvider(formData: FormData) {
  const { supabase } = await currentProfile();
  await supabase
    .from('providers')
    .update({
      name: String(formData.get('name') || '').trim(),
      specialty: String(formData.get('specialty') || '').trim() || null,
      phone: String(formData.get('phone') || '').trim() || null,
    })
    .eq('id', String(formData.get('providerId')));
  revalidatePath('/providers');
}

export async function removeProvider(formData: FormData) {
  const { supabase, profile } = await currentProfile();
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede borrar proveedores');
  await supabase.from('providers').delete().eq('id', String(formData.get('providerId')));
  revalidatePath('/providers');
}

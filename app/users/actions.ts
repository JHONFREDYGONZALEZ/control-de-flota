'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function currentAdminProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) throw new Error('Perfil no encontrado');
  if (profile.role !== 'admin') throw new Error('Solo un administrador puede gestionar usuarios');
  return { supabase, profile };
}

export async function inviteUser(formData: FormData) {
  const { supabase, profile } = await currentAdminProfile();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const fullName = String(formData.get('fullName') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'operador');

  if (!email || !fullName || !password) {
    redirect(
      `/users?error=${encodeURIComponent('Completa todos los campos')}&fullName=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}`
    );
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    let message = error?.message || 'No se pudo crear el usuario';
    if (message.toLowerCase().includes('already been registered') || message.toLowerCase().includes('already registered')) {
      message = 'Ese correo ya está registrado. Usa otro correo, o revisa si esa persona ya tiene acceso en la lista de abajo.';
    }
    redirect(
      `/users?error=${encodeURIComponent(message)}&fullName=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}`
    );
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    company_id: profile.company_id,
    full_name: fullName,
    email,
    role,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    redirect(
      `/users?error=${encodeURIComponent(profileError.message)}&fullName=${encodeURIComponent(fullName)}&role=${encodeURIComponent(role)}`
    );
  }

  revalidatePath('/users');
  redirect('/users');
}

export async function removeUserAccess(formData: FormData) {
  const { supabase, profile } = await currentAdminProfile();
  const userId = String(formData.get('userId'));

  if (userId === profile.id) throw new Error('No puedes quitarte tu propio acceso');

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('role', 'admin');

  const { data: target } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (target?.role === 'admin' && (count || 0) <= 1) {
    throw new Error('Debe existir al menos un administrador');
  }

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  await supabase.from('profiles').delete().eq('id', userId);

  revalidatePath('/users');
}

export async function changeUserRole(formData: FormData) {
  const { supabase, profile } = await currentAdminProfile();
  const userId = String(formData.get('userId'));
  const role = String(formData.get('role'));

  if (userId === profile.id && role !== 'admin') {
    throw new Error('No puedes quitarte a ti mismo el rol de administrador');
  }

  await supabase.from('profiles').update({ role }).eq('id', userId);
  revalidatePath('/users');
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const supabase = createClient();
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard');
}

export async function signUpFirstAdmin(formData: FormData) {
  const supabase = createClient();
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('fullName') || '');
  const companyName = String(formData.get('companyName') || 'PNR SAS');

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) redirect(`/signup?error=${encodeURIComponent(error?.message || 'No se pudo crear la cuenta')}`);

  // crea la empresa y el perfil de administrador (requiere sesión activa tras signUp)
  const { error: rpcError } = await supabase.rpc('create_company_and_admin', {
    p_company_name: companyName,
    p_full_name: fullName,
  });
  if (rpcError) redirect(`/signup?error=${encodeURIComponent(rpcError.message)}`);

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

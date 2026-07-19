import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con la service role key: puede crear/borrar usuarios de autenticación.
 * SOLO se usa dentro de server actions (nunca llega al navegador).
 * Requiere la variable de entorno SUPABASE_SERVICE_ROLE_KEY (NO pública).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

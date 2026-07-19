import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PasswordField from '@/components/PasswordField';
import { inviteUser, removeUserAccess, changeUserRole } from './actions';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', gerencia: 'Gerencia', operador: 'Operador' };

export default async function UsersPage({ searchParams }: { searchParams: { error?: string; fullName?: string; role?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  if (profile!.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
          ← Volver
        </Link>
        <div className="card text-center text-dim">Solo un administrador puede ver esta sección.</div>
      </div>
    );
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', profile!.company_id)
    .order('created_at');

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
        ← Volver
      </Link>
      <h2 className="font-display text-xl mb-4">Usuarios con acceso</h2>

      {(users || []).map((u) => (
        <div key={u.id} className="card flex justify-between items-center mb-2.5 flex-wrap gap-2">
          <div>
            <div className="font-semibold text-sm">{u.full_name}</div>
            <div className="text-dim text-xs mt-1">
              {u.email} · <span className="capitalize">{ROLE_LABEL[u.role] || u.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <form action={changeUserRole} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <select name="role" defaultValue={u.role}>
                <option value="operador">Operador</option>
                <option value="gerencia">Gerencia</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="submit" className="btn btn-sm">
                Guardar
              </button>
            </form>
            {u.id !== profile!.id && (
              <form action={removeUserAccess}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="btn btn-sm btn-danger">Quitar acceso</button>
              </form>
            )}
          </div>
        </div>
      ))}

      <details className="mt-4" open={!!searchParams.error || undefined}>
        <summary className="btn btn-primary cursor-pointer list-none">+ Invitar usuario</summary>
        <form action={inviteUser} className="card mt-2 space-y-3">
          {searchParams.error && (
            <div className="text-sm text-red bg-red/10 border border-red/30 rounded-lg p-3">{searchParams.error}</div>
          )}
          <div className="field">
            <label>Nombre completo</label>
            <input name="fullName" required autoFocus defaultValue={searchParams.fullName || ''} />
          </div>
          <div className="field">
            <label>Correo</label>
            <input type="email" name="email" required />
          </div>
          <PasswordField name="password" label="Contraseña inicial" minLength={6} />
          <div className="field">
            <label>Rol</label>
            <select name="role" defaultValue={searchParams.role || 'operador'}>
              <option value="operador">Operador (actualiza mantenimientos)</option>
              <option value="gerencia">Gerencia (aprueba órdenes de trabajo)</option>
              <option value="admin">Administrador (gestiona vehículos y usuarios)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Crear usuario
          </button>
        </form>
      </details>
    </div>
  );
}

import { signIn } from './actions';
import Link from 'next/link';
import PasswordField from '@/components/PasswordField';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="max-w-[420px] mx-auto mt-16 text-center px-4">
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber to-red mx-auto mb-4 flex items-center justify-center font-display font-bold text-bg text-xl">
        CF
      </div>
      <h1 className="font-display text-2xl uppercase mb-1">Control de flota</h1>
      <p className="text-dim text-sm">Inicia sesión para continuar</p>

      {searchParams.error && (
        <div className="mt-4 text-sm text-red bg-red/10 border border-red/30 rounded-lg p-3">
          {searchParams.error}
        </div>
      )}

      <form action={signIn} className="mt-6 text-left space-y-4">
        <div className="field">
          <label>Correo</label>
          <input type="email" name="email" required autoFocus />
        </div>
        <PasswordField name="password" label="Contraseña" />
        <button type="submit" className="btn btn-primary w-full">
          Entrar
        </button>
      </form>

      <p className="text-dim text-xs mt-5">
        ¿Primera vez con esta empresa?{' '}
        <Link href="/signup" className="text-teal">
          Crea la cuenta de administrador
        </Link>
      </p>
    </div>
  );
}

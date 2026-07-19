import { signUpFirstAdmin } from '../login/actions';
import PasswordField from '@/components/PasswordField';

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="max-w-[420px] mx-auto mt-16 text-center px-4">
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber to-red mx-auto mb-4 flex items-center justify-center font-display font-bold text-bg text-xl">
        CF
      </div>
      <h1 className="font-display text-2xl uppercase mb-1">Control de flota</h1>
      <p className="text-dim text-sm">Crea tu empresa y el usuario administrador</p>

      {searchParams.error && (
        <div className="mt-4 text-sm text-red bg-red/10 border border-red/30 rounded-lg p-3">
          {searchParams.error}
        </div>
      )}

      <form action={signUpFirstAdmin} className="mt-6 text-left space-y-4">
        <div className="field">
          <label>Nombre de la empresa</label>
          <input name="companyName" defaultValue="PNR SAS" required autoFocus />
        </div>
        <div className="field">
          <label>Tu nombre completo</label>
          <input name="fullName" required />
        </div>
        <div className="field">
          <label>Correo</label>
          <input type="email" name="email" required />
        </div>
        <PasswordField name="password" label="Contraseña" minLength={6} />
        <button type="submit" className="btn btn-primary w-full">
          Crear cuenta
        </button>
      </form>
    </div>
  );
}

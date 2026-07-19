import Link from 'next/link';
import { addVehicleFromDashboard } from './actions';

export default function NewVehiclePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <Link href="/dashboard" className="btn btn-ghost btn-sm mb-4 inline-block">
        ← Volver
      </Link>
      <h2 className="font-display text-xl mb-4">Agregar vehículo</h2>
      <form action={addVehicleFromDashboard} className="card space-y-3">
        <div className="field">
          <label>Placa</label>
          <input name="placa" required autoFocus style={{ textTransform: 'uppercase' }} placeholder="ABC123" />
        </div>
        <div className="field">
          <label>Marca</label>
          <input name="marca" required placeholder="Chevrolet" />
        </div>
        <div className="field">
          <label>Modelo</label>
          <input name="modelo" required placeholder="NPR" />
        </div>
        <div className="field">
          <label>Año</label>
          <input name="anio" type="number" placeholder="2022" />
        </div>
        <div className="field">
          <label>Km inicial (opcional)</label>
          <input name="kmInicial" type="number" min="0" placeholder="0" />
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard" className="btn btn-ghost flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary flex-1">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

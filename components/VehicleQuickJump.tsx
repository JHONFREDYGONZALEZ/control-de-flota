'use client';

import { useRouter } from 'next/navigation';

export default function VehicleQuickJump({
  vehicles,
}: {
  vehicles: { id: string; placa: string; marca: string; modelo: string; anio: number | null }[];
}) {
  const router = useRouter();

  return (
    <div className="field mt-4">
      <label>Ir directo a un vehículo</label>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) router.push(`/vehicles/${e.target.value}`);
        }}
      >
        <option value="" disabled>
          Selecciona placa y descripción…
        </option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.placa} — {v.marca} {v.modelo} {v.anio || ''}
          </option>
        ))}
      </select>
    </div>
  );
}

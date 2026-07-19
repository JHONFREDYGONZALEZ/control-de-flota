import Link from 'next/link';
import { getDashboardData } from '@/lib/getDashboardData';
import { fmtKm, fmtDateTime } from '@/lib/fleet';
import { signOut } from '../login/actions';
import {
  registerKm,
  deleteObservation,
  approveWorkOrder,
  invoiceWorkOrder,
} from '../actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { profile, vehicles, observations, providers, allWorkOrders } = await getDashboardData();
  const isAdmin = profile.role === 'admin';
  const canApprove = profile.role === 'admin' || profile.role === 'gerencia';

  const vehiclesWithAlerts = vehicles.filter((v) => v.summary.expiredCount > 0 || v.summary.warningCount > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      {/* topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-amber to-red flex items-center justify-center font-display font-bold text-bg text-sm">
            CF
          </div>
          <h1 className="font-display text-lg">{profile.companies?.name || 'Mi empresa'}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Link href="/providers" className="btn btn-sm">
              Proveedores
            </Link>
          )}
          <div className="flex items-center gap-2 bg-panel border border-border px-3 py-1.5 rounded-full text-xs">
            <span>{profile.full_name}</span>
            <span className="status-tag status-pending capitalize">{profile.role}</span>
          </div>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm">Salir</button>
          </form>
        </div>
      </div>

      {/* alertas */}
      <div className="card mb-4 !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-red shadow-[0_0_8px_theme(colors.red)]" />
          <h3 className="text-sm font-display">
            {vehiclesWithAlerts.length === 0
              ? 'Sin alertas activas'
              : `${vehiclesWithAlerts.length} vehículo${vehiclesWithAlerts.length === 1 ? '' : 's'} con alertas`}
          </h3>
        </div>
        {vehiclesWithAlerts.length === 0 ? (
          <div className="p-5 text-center text-dim text-sm">Todos los vehículos están al día.</div>
        ) : (
          vehiclesWithAlerts.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`} className="block px-4 py-3 border-b border-border last:border-0 hover:bg-panelHover">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="font-mono uppercase">{v.placa}</strong>{' '}
                  <span className="text-dim text-sm">
                    · {v.marca} {v.modelo}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {v.summary.alertItems.map((ai: any, i: number) => (
                  <span key={i} className={`status-tag status-${ai.status}`}>
                    {ai.name} {ai.detail && <span className="opacity-80 font-normal">· {ai.detail}</span>}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* observaciones */}
      <div className="card mb-4 !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-blue shadow-[0_0_8px_theme(colors.blue)]" />
          <h3 className="text-sm font-display">Observaciones de kilometraje</h3>
        </div>
        {observations.length === 0 ? (
          <div className="p-5 text-center text-dim text-sm">No hay observaciones registradas.</div>
        ) : (
          observations.map((o: any) => (
            <div key={o.id} className="px-4 py-3 border-b border-border last:border-0">
              <div className="flex justify-between items-start gap-2">
                <Link href={`/vehicles/${o.vehicles?.id}`} className="font-mono uppercase text-sm font-bold">
                  {o.vehicles?.placa}
                </Link>
                {isAdmin && (
                  <form action={deleteObservation}>
                    <input type="hidden" name="observationId" value={o.id} />
                    <button className="btn btn-sm btn-danger">Eliminar</button>
                  </form>
                )}
              </div>
              <p className="text-dim text-xs mt-1.5">{o.text}</p>
            </div>
          ))
        )}
      </div>

      {/* órdenes de trabajo */}
      <div className="card mb-4 !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_8px_theme(colors.teal)]" />
          <h3 className="text-sm font-display flex-1">Órdenes de trabajo</h3>
          <Link href="/work-orders/new" className="btn btn-sm btn-primary">
            + Generar orden
          </Link>
        </div>
        {allWorkOrders.length === 0 ? (
          <div className="p-5 text-center text-dim text-sm">Aún no se han generado órdenes de trabajo.</div>
        ) : (
          allWorkOrders.slice(0, 10).map((o: any) => (
            <div key={o.id} className="px-4 py-3 border-b border-border last:border-0">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="font-mono uppercase text-sm">{o.vehicle.placa}</strong>{' '}
                  <span className="text-dim text-sm">· {o.maintenance_name}</span>
                </div>
                <span className="text-dim text-xs">{fmtDateTime(o.created_at)}</span>
              </div>
              <p className="text-dim text-xs mt-1">proveedor: {o.provider_name}</p>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {o.approved ? (
                  <span className="status-tag status-ok">Aprobada por gerencia</span>
                ) : canApprove ? (
                  <form action={approveWorkOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-sm btn-primary">Aprobar</button>
                  </form>
                ) : (
                  <span className="status-tag status-warning">Pendiente aprobación</span>
                )}
                {o.invoiced ? (
                  <span className="status-tag status-ok">Facturada #{o.invoice_number}</span>
                ) : (
                  <details>
                    <summary className="btn btn-sm cursor-pointer list-none">Facturar</summary>
                    <form action={invoiceWorkOrder} className="mt-2 space-y-2 w-64">
                      <input type="hidden" name="orderId" value={o.id} />
                      <div className="field">
                        <label>Valor del servicio</label>
                        <input name="value" type="number" min="0" step="any" required />
                      </div>
                      <div className="field">
                        <label>Número de factura</label>
                        <input name="invoiceNumber" required />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm w-full">
                        Guardar
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* entrega de vehículo */}
      <div className="card mb-4 !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue shadow-[0_0_8px_theme(colors.blue)]" />
          <h3 className="text-sm font-display flex-1">Entrega de vehículo</h3>
          <Link href="/deliveries/new" className="btn btn-sm btn-primary">
            + Registrar entrega
          </Link>
        </div>
      </div>

      {/* toolbar + agregar vehículo */}
      <div className="flex justify-between items-center gap-2 mb-4 flex-wrap">
        <h2 className="font-display text-sm text-dim uppercase">Vehículos</h2>
        {isAdmin && (
          <Link href="/vehicles/new" className="btn btn-primary btn-sm">
            + Agregar vehículo
          </Link>
        )}
      </div>

      {/* grid vehículos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicles.map((v) => (
          <div key={v.id} className="card relative">
            <span
              className={`absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full ${
                v.summary.worst === 'expired'
                  ? 'bg-red shadow-[0_0_8px_theme(colors.red)]'
                  : v.summary.worst === 'warning'
                  ? 'bg-amber shadow-[0_0_8px_theme(colors.amber)]'
                  : 'bg-teal'
              }`}
            />
            <Link href={`/vehicles/${v.id}`}>
              <div className="font-mono font-bold text-lg uppercase border-2 border-border inline-block px-2.5 py-0.5 rounded-md mb-2">
                {v.placa}
              </div>
              <div className="text-sm text-dim">
                {v.marca} {v.modelo} · {v.anio}
              </div>
            </Link>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {v.summary.expiredCount > 0 && <span className="status-tag status-expired">{v.summary.expiredCount} vencido(s)</span>}
              {v.summary.warningCount > 0 && <span className="status-tag status-warning">{v.summary.warningCount} próximo(s)</span>}
              {v.summary.expiredCount === 0 && v.summary.warningCount === 0 && <span className="status-tag status-ok">Al día</span>}
            </div>
            <div className="flex items-center justify-between mt-2.5 text-xs text-dim">
              <span>
                Km: <strong className="font-mono">{fmtKm(v.current_km)}</strong>
              </span>
              <details>
                <summary className="btn btn-sm cursor-pointer list-none">Registrar km</summary>
                <form action={registerKm} className="mt-2 space-y-2">
                  <input type="hidden" name="vehicleId" value={v.id} />
                  <input name="km" type="number" min="0" required placeholder="Km actual" />
                  <button type="submit" className="btn btn-primary btn-sm w-full">
                    Guardar
                  </button>
                </form>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

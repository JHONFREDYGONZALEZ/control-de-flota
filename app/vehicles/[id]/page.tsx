import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { docStatus, maintStatus, statusLabel, fmtDate, fmtKm, fmtDateTime, kmFridayNeedsAlert, DELIVERY_PHOTO_SLOTS } from '@/lib/fleet';
import { registerKm } from '@/app/actions';
import { updateDocument, addCustomDocument, updateMaintenanceItem, addCustomMaintenanceItem, addDelivery, deleteVehicle } from './actions';

export const dynamic = 'force-dynamic';

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const isAdmin = profile!.role === 'admin';

  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', params.id).single();
  if (!vehicle) notFound();

  const [{ data: documents }, { data: items }, { data: deliveries }, { data: workOrders }, { data: kmLogs }] = await Promise.all([
    supabase.from('documents').select('*').eq('vehicle_id', params.id).order('created_at'),
    supabase.from('maintenance_items').select('*').eq('vehicle_id', params.id).order('created_at'),
    supabase.from('deliveries').select('*, delivery_photos(*)').eq('vehicle_id', params.id).order('created_at', { ascending: false }),
    supabase.from('work_orders').select('*, providers(name, phone)').eq('vehicle_id', params.id).order('created_at', { ascending: false }),
    supabase.from('km_logs').select('*').eq('vehicle_id', params.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const fridayAlert = kmFridayNeedsAlert(kmLogs?.[0]?.created_at || null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-2">
        <div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm mb-3 inline-block">
            ← Volver
          </Link>
          <h2 className="font-mono uppercase text-2xl">{vehicle.placa}</h2>
          <p className="text-dim text-sm">
            {vehicle.marca} {vehicle.modelo} · {vehicle.anio}
          </p>
        </div>
        {isAdmin && (
          <form action={deleteVehicle}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <button className="btn btn-danger btn-sm">Eliminar vehículo</button>
          </form>
        )}
      </div>

      {/* kilometraje */}
      <div className="card mt-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            Kilometraje actual: <span className="font-mono text-lg font-bold">{fmtKm(vehicle.current_km)}</span>
          </div>
          <details>
            <summary className="btn btn-primary btn-sm cursor-pointer list-none">Registrar kilometraje</summary>
            <form action={registerKm} className="mt-2 space-y-2 w-56">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <input name="km" type="number" min="0" defaultValue={vehicle.current_km || ''} required />
              <button type="submit" className="btn btn-primary btn-sm w-full">
                Guardar
              </button>
            </form>
          </details>
        </div>
        {fridayAlert && <div className="text-red text-xs mt-2">⚠ Falta registrar el kilometraje de esta semana (viernes)</div>}
        {(kmLogs || []).length > 0 && (
          <details className="mt-2">
            <summary className="text-dim text-xs cursor-pointer">Ver histórico de kilometraje ({kmLogs!.length})</summary>
            <div className="mt-2 space-y-1 border-t border-border pt-2">
              {kmLogs!.map((h) => (
                <div key={h.id} className="text-xs text-dim">
                  <strong className="font-mono">{fmtKm(h.km)}</strong> · {fmtDateTime(h.created_at)}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* 1. documentos */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">1 · Documentos</h3>
        {(documents || []).map((doc) => {
          const status = docStatus(doc);
          const label = doc.has_expiry ? statusLabel(status) : doc.file_url ? 'Archivado' : 'Sin archivo';
          const isPropiedad = doc.name === 'Tarjeta de propiedad';
          return (
            <div key={doc.id} className="card flex justify-between items-start mb-2.5 flex-wrap gap-2">
              <div>
                <div className="font-semibold text-sm">{doc.name}</div>
                <div className="text-dim text-xs mt-1">
                  {doc.has_expiry ? `Vence: ${fmtDate(doc.due_date)}` : 'Sin fecha de vencimiento'}
                  {doc.file_url && (
                    <>
                      {' · '}
                      <a href={doc.file_url} target="_blank" className="text-teal">
                        Ver documento
                      </a>
                    </>
                  )}
                  {doc.owner ? ` · Propietario: ${doc.owner}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-tag status-${status}`}>{label}</span>
                <details>
                  <summary className="btn btn-sm btn-primary cursor-pointer list-none">Cargar / actualizar</summary>
                  <form action={updateDocument} className="mt-2 space-y-2 w-64" encType="multipart/form-data">
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <input type="hidden" name="hasExpiry" value={doc.has_expiry ? '1' : '0'} />
                    {doc.has_expiry && (
                      <div className="field">
                        <label>Fecha de vencimiento</label>
                        <input type="date" name="dueDate" defaultValue={doc.due_date || ''} required />
                      </div>
                    )}
                    {isPropiedad && (
                      <div className="field">
                        <label>Propietario</label>
                        <input name="owner" defaultValue={doc.owner || ''} />
                      </div>
                    )}
                    <div className="field">
                      <label>Archivo (imagen o pdf)</label>
                      <input type="file" name="file" accept="image/*,.pdf" />
                    </div>
                    <div className="field">
                      <label>Nota</label>
                      <input name="note" defaultValue={doc.note || ''} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm w-full">
                      Guardar
                    </button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
        <details>
          <summary className="btn cursor-pointer list-none">+ Agregar documento personalizado</summary>
          <form action={addCustomDocument} className="card mt-2 space-y-2">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input name="name" placeholder="Nombre del documento" required />
            <input type="date" name="dueDate" />
            <button type="submit" className="btn btn-primary btn-sm">
              Guardar
            </button>
          </form>
        </details>
      </div>

      {/* 2. mantenimientos */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">2 · Mantenimientos y reparaciones</h3>
        {(items || []).map((it) => {
          const s = maintStatus(it, vehicle.current_km);
          return (
            <div key={it.id} className="card flex justify-between items-start mb-2.5 flex-wrap gap-2">
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-sm">{it.name}</div>
                <div className="text-dim text-xs mt-1">
                  Próximo: {fmtKm(it.due_km)} {it.last_km != null && `· Último: ${fmtKm(it.last_km)}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-tag status-${s}`}>{statusLabel(s)}</span>
                <details>
                  <summary className="btn btn-sm btn-primary cursor-pointer list-none">Actualizar</summary>
                  <form action={updateMaintenanceItem} className="mt-2 space-y-2 w-72" encType="multipart/form-data">
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <div className="field">
                      <label>Km del mantenimiento</label>
                      <input name="lastKm" type="number" defaultValue={it.last_km ?? vehicle.current_km ?? ''} required />
                    </div>
                    <div className="field">
                      <label>Frecuencia en km</label>
                      <input name="intervalKm" type="number" defaultValue={it.interval_km || ''} />
                    </div>
                    <div className="field">
                      <label>Próximo mantenimiento (km)</label>
                      <input name="dueKm" type="number" defaultValue={it.due_km || ''} required />
                    </div>
                    <div className="field">
                      <label>Orden de trabajo (texto)</label>
                      <textarea name="details" rows={3} placeholder="Detalle del trabajo o pega el texto de la orden" />
                    </div>
                    <div className="field">
                      <label>Foto (opcional)</label>
                      <input type="file" name="photo" accept="image/*,.pdf" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm w-full">
                      Guardar
                    </button>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
        <details>
          <summary className="btn cursor-pointer list-none">+ Agregar ítem de mantenimiento (otros)</summary>
          <form action={addCustomMaintenanceItem} className="card mt-2 space-y-2">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input name="name" placeholder="Nombre del ítem" required />
            <input name="intervalKm" type="number" placeholder="Frecuencia en km" />
            <input name="alertKm" type="number" placeholder="Alertar con cuántos km de anticipación" defaultValue={2000} />
            <button type="submit" className="btn btn-primary btn-sm">
              Guardar
            </button>
          </form>
        </details>
      </div>

      {/* 3. entrega */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">3 · Entrega de vehículo</h3>
        {(deliveries || []).length === 0 ? (
          <div className="card text-center text-dim text-sm">Este vehículo aún no tiene un registro de entrega.</div>
        ) : (
          deliveries!.slice(0, 1).map((d) => (
            <div key={d.id} className="card mb-2.5">
              <div className="font-semibold text-sm">Asignado a: {d.assigned_to}</div>
              <div className="text-dim text-xs mt-1">Fecha de entrega: {fmtDate(d.delivery_date)}</div>
              {d.notes && <div className="text-dim text-xs mt-1">{d.notes}</div>}
              {d.delivery_photos?.length > 0 && (
                <div className="text-dim text-xs mt-1">
                  Fotos:{' '}
                  {d.delivery_photos.map((p: any, i: number) => (
                    <a key={p.id} href={p.photo_url} target="_blank" className="text-teal">
                      {DELIVERY_PHOTO_SLOTS.find((s) => s.key === p.slot)?.label || p.slot}
                      {i < d.delivery_photos.length - 1 ? ', ' : ''}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {(deliveries || []).length > 1 && (
          <details className="mb-3">
            <summary className="text-dim text-xs cursor-pointer">Ver histórico de entregas ({deliveries!.length - 1})</summary>
            <div className="mt-2 space-y-1">
              {deliveries!.slice(1).map((d) => (
                <div key={d.id} className="text-xs text-dim">
                  <strong className="font-mono">{fmtDate(d.delivery_date)}</strong> — {d.assigned_to}
                </div>
              ))}
            </div>
          </details>
        )}
        <details>
          <summary className="btn btn-primary cursor-pointer list-none">+ Registrar entrega</summary>
          <form action={addDelivery} className="card mt-2 space-y-3" encType="multipart/form-data">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <div className="field">
              <label>Persona asignada</label>
              <input name="assignedTo" required />
            </div>
            <div className="field">
              <label>Fecha de entrega</label>
              <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div className="field">
              <label>Notas</label>
              <textarea name="notes" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_PHOTO_SLOTS.map((s) => (
                <div className="field" key={s.key}>
                  <label>{s.label}</label>
                  <input type="file" name={`photo_${s.key}`} accept="image/*" capture="environment" />
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Guardar
            </button>
          </form>
        </details>
      </div>

      {/* 4. órdenes de trabajo */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">4 · Órdenes de trabajo</h3>
        {(workOrders || []).length === 0 && <div className="card text-center text-dim text-sm">Aún no se han generado órdenes.</div>}
        {(workOrders || []).map((o: any) => (
          <div key={o.id} className="card mb-2.5">
            <div className="font-semibold text-sm">{o.maintenance_name}</div>
            <div className="text-dim text-xs mt-1">
              Proveedor: {o.providers?.name} {o.providers?.phone ? `· ${o.providers.phone}` : ''} · {fmtDateTime(o.created_at)}
            </div>
            {o.value != null && <div className="text-dim text-xs mt-1">Valor: ${Number(o.value).toLocaleString('es-CO')}</div>}
            <div className="flex gap-1.5 mt-2">
              <span className={`status-tag ${o.approved ? 'status-ok' : 'status-warning'}`}>
                {o.approved ? 'Aprobada por gerencia' : 'Pendiente aprobación'}
              </span>
              <span className={`status-tag ${o.invoiced ? 'status-ok' : 'status-pending'}`}>
                {o.invoiced ? `Facturada #${o.invoice_number}` : 'Sin facturar'}
              </span>
            </div>
          </div>
        ))}
        <p className="text-dim text-xs">Para generar una nueva orden, hazlo desde el módulo "Órdenes de trabajo" en la pantalla principal.</p>
      </div>
    </div>
  );
}

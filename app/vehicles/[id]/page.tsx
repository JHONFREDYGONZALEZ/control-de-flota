import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { docStatus, maintStatus, statusLabel, fmtDate, fmtKm, fmtDateTime, kmFridayNeedsAlert, DELIVERY_PHOTO_SLOTS, buildOrderWhatsappText, waLink } from '@/lib/fleet';
import { registerKm, generateWorkOrder, updateWorkOrder } from '@/app/actions';
import PhotoField from '@/components/PhotoField';
import MaintenanceTypeField from '@/components/MaintenanceTypeField';
import MaintenanceKmFields from '@/components/MaintenanceKmFields';
import DocumentFileField from '@/components/DocumentFileField';
import NotApplicableDateField from '@/components/NotApplicableDateField';
import CancelDetailsButton from '@/components/CancelDetailsButton';
import { updateDocument, addCustomDocument, updateMaintenanceItem, addCustomMaintenanceItem, addDelivery, updateDeliveryPhotos, deleteVehicle } from './actions';
import SubmitButton from '@/components/SubmitButton';

export const dynamic = 'force-dynamic';

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*, companies(name)').eq('id', user!.id).single();
  const isAdmin = profile!.role === 'admin';
  const canEditApproved = profile!.role === 'admin' || profile!.role === 'gerencia';

  const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', params.id).single();
  if (!vehicle) notFound();

  const [{ data: documents }, { data: items }, { data: deliveries }, { data: workOrders }, { data: kmLogs }, { data: providers }] = await Promise.all([
    supabase.from('documents').select('*, document_history(*)').eq('vehicle_id', params.id).order('created_at'),
    supabase.from('maintenance_items').select('*').eq('vehicle_id', params.id).order('created_at'),
    supabase.from('deliveries').select('*, delivery_photos(*)').eq('vehicle_id', params.id).order('created_at', { ascending: false }),
    supabase.from('work_orders').select('*, providers(name, phone)').eq('vehicle_id', params.id).order('created_at', { ascending: false }),
    supabase.from('km_logs').select('*').eq('vehicle_id', params.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('providers').select('*').eq('company_id', profile!.company_id).order('name'),
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
            <SubmitButton className="btn btn-danger btn-sm">Eliminar vehículo</SubmitButton>
          </form>
        )}
      </div>

      {/* kilometraje */}
      <div className="card mt-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            Kilometraje actual: <span className="font-mono text-lg font-bold">{fmtKm(vehicle.current_km)}</span>
          </div>
          <details className="form-details">
            <summary className="btn btn-primary btn-sm cursor-pointer list-none">Registrar kilometraje</summary>
            <form action={registerKm} className="mt-2 space-y-2 w-56">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <input name="km" type="number" min="0" defaultValue={vehicle.current_km || ''} required />
              <div className="flex gap-2">
                <CancelDetailsButton />
                <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar</SubmitButton>
              </div>
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
          const label = doc.not_applicable
            ? 'No aplica'
            : doc.has_expiry
            ? statusLabel(status)
            : doc.file_url
            ? 'Archivado'
            : 'Sin archivo';
          const isPropiedad = doc.name === 'Tarjeta de propiedad';
          const canBeNotApplicable = doc.name === 'Seguro todo riesgo' || doc.name === 'Tecnomecánica';
          return (
            <div key={doc.id} className="card flex justify-between items-start mb-2.5 flex-wrap gap-2">
              <div>
                <div className="font-semibold text-sm">{doc.name}</div>
                <div className="text-dim text-xs mt-1">
                  {doc.not_applicable
                    ? 'No aplica a este vehículo'
                    : doc.has_expiry
                    ? `Vence: ${fmtDate(doc.due_date)}`
                    : 'Sin fecha de vencimiento'}
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
                {doc.document_history && doc.document_history.length > 0 && (
                  <details className="mt-1.5">
                    <summary className="text-dim text-xs cursor-pointer">
                      Ver histórico de archivos cargados ({doc.document_history.length})
                    </summary>
                    <div className="mt-1.5 space-y-1">
                      {[...doc.document_history]
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((h: any) => (
                          <div key={h.id} className="text-xs text-dim">
                            {fmtDateTime(h.created_at)}
                            {h.file_url && (
                              <>
                                {' · '}
                                <a href={h.file_url} target="_blank" className="text-teal">
                                  ver archivo
                                </a>
                              </>
                            )}
                            {h.owner ? ` · propietario: ${h.owner}` : ''}
                          </div>
                        ))}
                    </div>
                  </details>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-tag status-${status}`}>{label}</span>
                <details className="form-details">
                  <summary className="btn btn-sm btn-primary cursor-pointer list-none">Cargar / actualizar</summary>
                  <form action={updateDocument} className="mt-2 space-y-2 w-64" encType="multipart/form-data">
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <input type="hidden" name="hasExpiry" value={doc.has_expiry ? '1' : '0'} />
                    {doc.has_expiry && canBeNotApplicable && (
                      <NotApplicableDateField notApplicableDefault={doc.not_applicable} dueDateDefault={doc.due_date} />
                    )}
                    {doc.has_expiry && !canBeNotApplicable && (
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
                    <DocumentFileField name="file" existingUrl={doc.file_url} />
                    <div className="flex gap-2">
                      <CancelDetailsButton />
                      <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar</SubmitButton>
                    </div>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
        <details className="form-details">
          <summary className="btn cursor-pointer list-none">+ Agregar documento personalizado</summary>
          <form action={addCustomDocument} className="card mt-2 space-y-2">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input name="name" placeholder="Nombre del documento" required />
            <input type="date" name="dueDate" />
            <div className="flex gap-2">
              <CancelDetailsButton />
              <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar</SubmitButton>
            </div>
          </form>
        </details>
      </div>

      {/* 2. mantenimientos */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">2 · Parámetros mantenimiento y reparaciones</h3>
        {(items || []).map((it) => {
          const s = maintStatus(it, vehicle.current_km);
          const needsPhoto = it.name !== 'Cambio de aceite' && it.name !== 'Lavado';
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
                <details className="form-details">
                  <summary className="btn btn-sm btn-primary cursor-pointer list-none">Actualizar</summary>
                  <form action={updateMaintenanceItem} className="mt-2 space-y-2 w-72" encType="multipart/form-data">
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="vehicleId" value={vehicle.id} />
                    <MaintenanceKmFields
                      lastKmDefault={it.last_km ?? vehicle.current_km ?? null}
                      intervalKmDefault={it.interval_km}
                    />
                    <div className="field">
                      <label>Orden de trabajo (texto)</label>
                      <textarea name="details" rows={3} placeholder="Detalle del trabajo o pega el texto de la orden" />
                    </div>
                    {needsPhoto && (
                      <div className="field">
                        <label>Foto (opcional)</label>
                        <input type="file" name="photo" accept="image/*,.pdf" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <CancelDetailsButton />
                      <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar</SubmitButton>
                    </div>
                  </form>
                </details>
              </div>
            </div>
          );
        })}
        <details className="form-details">
          <summary className="btn cursor-pointer list-none">+ Agregar ítem de mantenimiento (otros)</summary>
          <form action={addCustomMaintenanceItem} className="card mt-2 space-y-2">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <input name="name" placeholder="Nombre del ítem" required />
            <input name="intervalKm" type="number" placeholder="Frecuencia en km" />
            <input name="alertKm" type="number" placeholder="Alertar con cuántos km de anticipación" defaultValue={2000} />
            <div className="flex gap-2">
              <CancelDetailsButton />
              <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar</SubmitButton>
            </div>
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
              {d.delivery_photos?.length > 0 ? (
                <div className="text-dim text-xs mt-1">
                  Fotos:{' '}
                  {d.delivery_photos.map((p: any, i: number) => (
                    <a key={p.id} href={p.photo_url} target="_blank" className="text-teal">
                      {DELIVERY_PHOTO_SLOTS.find((s) => s.key === p.slot)?.label || p.slot}
                      {i < d.delivery_photos.length - 1 ? ', ' : ''}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-dim text-xs mt-1">Sin fotos adjuntas.</div>
              )}
              <details className="mt-2 form-details">
                <summary className="btn btn-sm cursor-pointer list-none">Reemplazar fotos</summary>
                <form action={updateDeliveryPhotos} className="mt-2 space-y-3" encType="multipart/form-data">
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <div className="grid grid-cols-2 gap-2">
                    {DELIVERY_PHOTO_SLOTS.map((s) => {
                      const existing = d.delivery_photos?.find((p: any) => p.slot === s.key);
                      return (
                        <PhotoField
                          key={s.key}
                          name={`photo_${s.key}`}
                          label={s.label}
                          existingUrl={existing?.photo_url || null}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <CancelDetailsButton />
                    <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar fotos reemplazadas</SubmitButton>
                  </div>
                </form>
              </details>
            </div>
          ))
        )}
        {(deliveries || []).length > 1 && (
          <details className="mb-3">
            <summary className="text-dim text-xs cursor-pointer">Ver histórico de entregas ({deliveries!.length - 1})</summary>
            <div className="mt-2 space-y-2">
              {deliveries!.slice(1).map((d) => (
                <div key={d.id} className="text-xs text-dim">
                  <strong className="font-mono">{fmtDate(d.delivery_date)}</strong> — {d.assigned_to}
                  {d.delivery_photos?.length > 0 && (
                    <div>
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
              ))}
            </div>
          </details>
        )}
        <details className="form-details">
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
                <PhotoField key={s.key} name={`photo_${s.key}`} label={s.label} />
              ))}
            </div>
            <div className="flex gap-2">
              <CancelDetailsButton />
              <SubmitButton className="btn btn-primary flex-1">Guardar</SubmitButton>
            </div>
          </form>
        </details>
      </div>

      {/* 4. órdenes de trabajo */}
      <div className="mt-6">
        <h3 className="text-xs uppercase text-dim tracking-wide mb-3">4 · Órdenes de trabajo</h3>
        {(workOrders || []).length === 0 && <div className="card text-center text-dim text-sm">Aún no se han generado órdenes.</div>}
        {(workOrders || []).map((o: any) => {
          const canEdit = !o.approved || canEditApproved;
          return (
            <div key={o.id} className="card mb-2.5">
              <div className="font-semibold text-sm">{o.maintenance_name}</div>
              <div className="text-dim text-xs mt-1">
                Proveedor: {o.providers?.name} {o.providers?.phone ? `· ${o.providers.phone}` : ''} · {fmtDateTime(o.created_at)}
              </div>
              {o.notes && <div className="text-dim text-xs mt-1">{o.notes}</div>}
              {o.value != null && <div className="text-dim text-xs mt-1">Valor: ${Number(o.value).toLocaleString('es-CO')}</div>}
              <div className="flex gap-1.5 mt-2 items-center flex-wrap">
                <span className={`status-tag ${o.approved ? 'status-ok' : 'status-warning'}`}>
                  {o.approved ? 'Aprobada por gerencia' : 'Pendiente aprobación'}
                </span>
                {o.approved && o.providers?.phone && (
                  <a
                    href={waLink(
                      o.providers.phone,
                      buildOrderWhatsappText({
                        companyName: profile!.companies?.name || 'Mi empresa',
                        placa: vehicle.placa,
                        marca: vehicle.marca,
                        modelo: vehicle.modelo,
                        anio: vehicle.anio,
                        currentKm: vehicle.current_km,
                        maintenanceName: o.maintenance_name,
                        providerName: o.providers.name,
                        providerPhone: o.providers.phone,
                        notes: o.notes,
                      })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    Enviar por WhatsApp
                  </a>
                )}
                <span className={`status-tag ${o.invoiced ? 'status-ok' : 'status-pending'}`}>
                  {o.invoiced ? `Facturada #${o.invoice_number}` : 'Sin facturar'}
                </span>
                {canEdit && (providers || []).length > 0 && (
                  <details className="form-details">
                    <summary className="btn btn-sm cursor-pointer list-none">Editar orden</summary>
                    <form action={updateWorkOrder} className="mt-2 space-y-2 w-72">
                      <input type="hidden" name="orderId" value={o.id} />
                      <input type="hidden" name="vehicleId" value={vehicle.id} />
                      <MaintenanceTypeField defaultValue={o.maintenance_name} />
                      <div className="field">
                        <label>Proveedor</label>
                        <select name="providerId" defaultValue={o.provider_id} required>
                          {providers!.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.specialty ? ` — ${p.specialty}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Instrucciones / notas</label>
                        <textarea name="notes" rows={3} defaultValue={o.notes || ''} />
                      </div>
                      <div className="flex gap-2">
                        <CancelDetailsButton />
                        <SubmitButton className="btn btn-primary btn-sm flex-1">Guardar cambios</SubmitButton>
                      </div>
                    </form>
                  </details>
                )}
              </div>
            </div>
          );
        })}
        {(providers || []).length === 0 ? (
          <p className="text-dim text-xs">
            Aún no tienes proveedores registrados.{' '}
            <Link href="/providers" className="text-teal">
              Crea uno primero
            </Link>
            .
          </p>
        ) : (
          <details className="form-details">
            <summary className="btn btn-primary cursor-pointer list-none">+ Generar orden de trabajo</summary>
            <form action={generateWorkOrder} className="card mt-2 space-y-3">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <MaintenanceTypeField />
              <div className="field">
                <label>Proveedor</label>
                <select name="providerId" required>
                  <option value="">Selecciona un proveedor</option>
                  {providers!.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.specialty ? ` — ${p.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Instrucciones / notas</label>
                <textarea name="notes" rows={3} placeholder="Detalles adicionales para el proveedor" />
              </div>
              <div className="flex gap-2">
                <CancelDetailsButton />
                <SubmitButton className="btn btn-primary flex-1">Generar orden</SubmitButton>
              </div>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}

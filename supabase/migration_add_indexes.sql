-- ============================================================
-- ÍNDICES para que las consultas (y los borrados en cascada) sean rápidas
-- cuando crezca el historial. Seguro de ejecutar varias veces.
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================
create index if not exists idx_observations_vehicle on observations(vehicle_id, created_at desc);
create index if not exists idx_document_history_document on document_history(document_id, created_at desc);
create index if not exists idx_maintenance_history_item on maintenance_history(maintenance_item_id, created_at desc);
create index if not exists idx_delivery_photos_delivery on delivery_photos(delivery_id);
create index if not exists idx_providers_company on providers(company_id, name);
create index if not exists idx_profiles_company on profiles(company_id);

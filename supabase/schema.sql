-- ============================================================
-- CONTROL DE FLOTA — esquema Supabase
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- EMPRESA ----------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'PNR SAS',
  created_at timestamptz not null default now()
);

-- ---------- PERFILES (extiende auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  email text,
  role text not null default 'operador' check (role in ('admin','gerencia','operador')),
  created_at timestamptz not null default now()
);

-- ---------- VEHÍCULOS ----------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  placa text not null,
  marca text,
  modelo text,
  anio int,
  current_km numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists vehicles_placa_company_uidx on vehicles(company_id, upper(placa));

-- ---------- KILOMETRAJE ----------
create table if not exists km_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  km numeric not null,
  logged_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- OBSERVACIONES (kilometraje cargado después del viernes) ----------
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  text text not null,
  obs_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- DOCUMENTOS (SOAT, todo riesgo, tecnomecánica, tarjeta de propiedad, etc.) ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  name text not null,
  is_custom boolean not null default false,
  has_expiry boolean not null default true,
  due_date date,
  alert_days int not null default 30,
  owner text,
  note text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists document_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  due_date date,
  file_url text,
  note text,
  owner text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- MANTENIMIENTOS (por kilometraje, incluye lavados) ----------
create table if not exists maintenance_items (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  name text not null,
  is_custom boolean not null default false,
  interval_km numeric,
  alert_km numeric not null default 2000,
  last_km numeric,
  due_km numeric,
  created_at timestamptz not null default now()
);

create table if not exists maintenance_history (
  id uuid primary key default gen_random_uuid(),
  maintenance_item_id uuid not null references maintenance_items(id) on delete cascade,
  km numeric,
  due_km numeric,
  details text,
  photo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- ENTREGA DE VEHÍCULO ----------
create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  assigned_to text not null,
  delivery_date date not null default current_date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists delivery_photos (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  slot text not null, -- frontal, derecho, izquierdo, atras, torpedo, tacometro, sillas, herramienta, kitCarretera
  photo_url text not null
);

-- ---------- PROVEEDORES ----------
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  specialty text,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- ÓRDENES DE TRABAJO ----------
create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  provider_id uuid references providers(id),
  maintenance_name text not null,
  notes text,
  value numeric,
  provider_notes text,
  physical_photo_url text,
  approved boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  invoiced boolean not null default false,
  invoice_number text,
  invoiced_by uuid references profiles(id),
  invoiced_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_documents_vehicle on documents(vehicle_id);
create index if not exists idx_maintenance_vehicle on maintenance_items(vehicle_id);
create index if not exists idx_km_logs_vehicle on km_logs(vehicle_id, created_at desc);
create index if not exists idx_work_orders_vehicle on work_orders(vehicle_id);
create index if not exists idx_work_orders_provider on work_orders(provider_id);
create index if not exists idx_deliveries_vehicle on deliveries(vehicle_id);

-- ============================================================
-- STORAGE (fotos y documentos)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('fleet-files', 'fleet-files', true)
on conflict (id) do nothing;

-- ============================================================
-- RLS: todo usuario autenticado ve/edita solo los datos de SU empresa
-- ============================================================
alter table companies enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table km_logs enable row level security;
alter table observations enable row level security;
alter table documents enable row level security;
alter table document_history enable row level security;
alter table maintenance_items enable row level security;
alter table maintenance_history enable row level security;
alter table deliveries enable row level security;
alter table delivery_photos enable row level security;
alter table providers enable row level security;
alter table work_orders enable row level security;

create or replace function current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

-- companies: solo lectura de la propia empresa
create policy "company read" on companies for select using (id = current_company_id());

-- profiles: ver compañeros de la misma empresa; cada quien edita lo suyo
create policy "profiles read same company" on profiles for select using (company_id = current_company_id());
create policy "profiles insert self" on profiles for insert with check (id = auth.uid());
create policy "profiles update self" on profiles for update using (id = auth.uid());

-- vehicles
create policy "vehicles read" on vehicles for select using (company_id = current_company_id());
create policy "vehicles write" on vehicles for all using (company_id = current_company_id()) with check (company_id = current_company_id());

-- providers
create policy "providers read" on providers for select using (company_id = current_company_id());
create policy "providers write" on providers for all using (company_id = current_company_id()) with check (company_id = current_company_id());

-- tablas hijas de vehicles: se validan a través del vehicle_id
create policy "km_logs all" on km_logs for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

create policy "observations all" on observations for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

create policy "documents all" on documents for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

create policy "document_history all" on document_history for all
  using (document_id in (select d.id from documents d join vehicles v on v.id=d.vehicle_id where v.company_id = current_company_id()))
  with check (document_id in (select d.id from documents d join vehicles v on v.id=d.vehicle_id where v.company_id = current_company_id()));

create policy "maintenance_items all" on maintenance_items for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

create policy "maintenance_history all" on maintenance_history for all
  using (maintenance_item_id in (select m.id from maintenance_items m join vehicles v on v.id=m.vehicle_id where v.company_id = current_company_id()))
  with check (maintenance_item_id in (select m.id from maintenance_items m join vehicles v on v.id=m.vehicle_id where v.company_id = current_company_id()));

create policy "deliveries all" on deliveries for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

create policy "delivery_photos all" on delivery_photos for all
  using (delivery_id in (select d.id from deliveries d join vehicles v on v.id=d.vehicle_id where v.company_id = current_company_id()))
  with check (delivery_id in (select d.id from deliveries d join vehicles v on v.id=d.vehicle_id where v.company_id = current_company_id()));

create policy "work_orders all" on work_orders for all
  using (vehicle_id in (select id from vehicles where company_id = current_company_id()))
  with check (vehicle_id in (select id from vehicles where company_id = current_company_id()));

-- Nota: la restricción "solo gerencia/admin aprueban" y "solo admin borra histórico"
-- se aplica en el código de la aplicación (server actions), que valida profiles.role
-- antes de ejecutar esas operaciones puntuales.

-- ============================================================
-- Crear automáticamente el perfil + empresa al registrarse el primer usuario
-- (usa la función más abajo desde la app al hacer signup)
-- ============================================================
create or replace function create_company_and_admin(p_company_name text, p_full_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  new_company_id uuid;
  user_email text;
begin
  select email into user_email from auth.users where id = auth.uid();
  insert into companies(name) values (coalesce(nullif(p_company_name,''), 'PNR SAS')) returning id into new_company_id;
  insert into profiles(id, company_id, full_name, email, role) values (auth.uid(), new_company_id, p_full_name, user_email, 'admin');
  return new_company_id;
end;
$$;

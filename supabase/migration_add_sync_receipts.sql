-- ============================================================
-- SINCRONIZACIÓN OFFLINE: recibos de registros ya procesados
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Evita que un registro guardado sin señal se duplique si el
-- celular reintenta el envío después de que ya había llegado.
-- ============================================================
create table if not exists sync_receipts (
  client_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table sync_receipts enable row level security;

drop policy if exists "sync_receipts self" on sync_receipts;
create policy "sync_receipts self" on sync_receipts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

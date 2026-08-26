-- Ejecutar UNA VEZ en el SQL Editor de Supabase (proyecto VEHICULOS).
-- Crea la tabla donde se guarda el "buzón" de cada celular que acepte
-- recibir notificaciones (necesaria para avisarle a gerencia de nuevas
-- órdenes de trabajo).

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions self" on push_subscriptions;
create policy "push_subscriptions self" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

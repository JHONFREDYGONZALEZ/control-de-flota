-- Ejecutar UNA VEZ en el SQL Editor de Supabase (reemplaza al script anterior,
-- que tenía un error de sintaxis y no llegó a crear los permisos).

drop policy if exists "fleet-files insert" on storage.objects;
drop policy if exists "fleet-files select" on storage.objects;
drop policy if exists "fleet-files update" on storage.objects;
drop policy if exists "fleet-files delete" on storage.objects;

create policy "fleet-files insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fleet-files');

create policy "fleet-files select" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'fleet-files');

create policy "fleet-files update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fleet-files');

create policy "fleet-files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fleet-files');

-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Agrega los permisos que faltaban para poder subir/ver/reemplazar/borrar
-- archivos (fotos y documentos) en el bucket "fleet-files".

create policy if not exists "fleet-files insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fleet-files');

create policy if not exists "fleet-files select" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'fleet-files');

create policy if not exists "fleet-files update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fleet-files');

create policy if not exists "fleet-files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fleet-files');

-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Agrega la opción "No aplica" para documentos que no todos los vehículos requieren
-- (por ejemplo, seguro todo riesgo o tecnomecánica).

alter table documents add column if not exists not_applicable boolean not null default false;

-- Ejecutar UNA VEZ en el SQL Editor de Supabase si tu base de datos ya existía
-- antes de esta actualización (agrega la columna que faltaba para mostrar el
-- correo de cada usuario en la pantalla de "Usuarios").

alter table profiles add column if not exists email text;

-- Rellena el correo de los perfiles que ya existían (como el tuyo, el admin):
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

# Control de flota — app real (Next.js + Supabase)

Esta es la versión real de la app (multiusuario, con base de datos en la nube),
construida a partir del prototipo. Cubre: vehículos, documentos, mantenimientos
por kilometraje (incluye lavados), kilometraje semanal con observaciones,
entrega de vehículo con fotos, proveedores, y órdenes de trabajo con
aprobación de gerencia y facturación.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com → **New project**.
2. Cuando esté listo, ve a **SQL Editor → New query**, pega todo el contenido
   de `supabase/schema.sql` y ejecútalo. Esto crea las tablas, la seguridad
   por fila (RLS) y el bucket de archivos `fleet-files`.
3. Ve a **Project settings → API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto localmente

```bash
cd fleet-app
npm install
cp .env.local.example .env.local
```

Edita `.env.local` y pega ahí la URL y la anon key de Supabase.

```bash
npm run dev
```

Abre `http://localhost:3000` → te llevará a `/login`. La primera vez, entra a
**"Crea la cuenta de administrador"** para crear tu empresa (por defecto
"PNR SAS") y tu usuario administrador. Desde ahí puedes invitar más personas
creando su cuenta con `supabase.auth.signUp` (para una versión completa de
"invitar usuarios" desde la interfaz, dime y lo agrego — por ahora cada
persona crea su cuenta con signup y tú le asignas el rol actualizando su fila
en la tabla `profiles` desde el SQL Editor: `admin`, `gerencia` u `operador`).

## 3. Subir a GitHub

```bash
cd fleet-app
git init
git add .
git commit -m "Control de flota - primera versión"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/control-de-flota.git
git push -u origin main
```

## 4. Desplegar en Vercel

1. Entra a https://vercel.com/new e importa el repositorio recién creado.
2. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Cuando termine, tendrás una URL pública (ej.
   `control-de-flota.vercel.app`) que puedes abrir desde el celular de cada
   persona del equipo.

## Novedades: invitar usuarios desde la app

Ya no hace falta crear usuarios manualmente en Supabase. Un administrador
puede ir a **"Usuarios"** dentro de la app y usar **"+ Invitar usuario"** para
crear personas con su rol (administrador, gerencia u operador), cambiarles el
rol después, o quitarles el acceso.

Para que esto funcione necesitas una clave adicional, la **service role
key** (tiene permisos de administrador sobre tu base de datos — nunca se
expone al navegador, solo se usa en el servidor):

1. En Supabase, ve a **Project Settings → API**.
2. Copia la clave que dice **"service_role"** (distinta de la "anon public").
3. Agrégala como variable de entorno:
   - En tu `.env.local` (para desarrollo local): `SUPABASE_SERVICE_ROLE_KEY=...`
   - En Vercel: **Settings → Environment Variables** → agrega
     `SUPABASE_SERVICE_ROLE_KEY` con ese valor (Production and Preview).
   - Después de agregarla en Vercel, haz un **Redeploy** para que tome efecto.

Si tu base de datos ya la creaste antes de esta actualización, ejecuta una
sola vez en el SQL Editor el archivo `supabase/migration_add_email.sql`
(agrega la columna de correo que faltaba).

## Qué quedó cubierto en esta versión

- Autenticación real por correo/contraseña (Supabase Auth), con roles
  **administrador**, **gerencia** y **operador**.
- Invitar usuarios, cambiar su rol y quitarles el acceso, todo desde la app.
- Vehículos, documentos (con alerta si falta archivo en los que no vencen),
  mantenimientos por kilometraje (incluye lavados), kilometraje con la regla
  del viernes y observaciones automáticas.
- Entrega de vehículo con las 9 fotos, desde la pantalla principal o desde
  cada vehículo.
- Proveedores (crear, editar, eliminar).
- Órdenes de trabajo: generación (en pantalla propia, igual que entrega),
  aprobación (gerencia o administrador) y facturación con número + valor.
- Archivos guardados en Supabase Storage (bucket `fleet-files`).
- Todo protegido por RLS: cada empresa solo ve sus propios datos.

## Lo que quedó simplificado (para una siguiente vuelta)

- Histórico completo visible en pantalla para documentos/mantenimientos (las
  tablas `document_history` y `maintenance_history` ya guardan todo; falta la
  vista para desplegarlo igual que en el prototipo).
- Borrado total/parcial de histórico restringido a administrador (la lógica
  de roles ya existe para aprobar/facturar/borrar observaciones; falta
  replicarla en estas dos tablas de histórico).
- Algunas acciones rápidas (editar proveedor, actualizar documento/
  mantenimiento) siguen usando un desplegable simple en vez de una ventana
  con botón "✕" — funcionan igual, solo que sin ese detalle visual.

Dímelo cuando quieras que sigamos con cualquiera de estos puntos — la base
(esquema, autenticación, roles, alertas) ya está lista para construir encima.

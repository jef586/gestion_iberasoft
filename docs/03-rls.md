# Auth + RLS — Licencias + Pagos

Este archivo define la estrategia completa de autenticación y
Row Level Security (RLS) para el sub-sistema de Licencias + Pagos
de Punto de Venta 2026.

Alcance:
- Solo 2 usuarios administradores internos
- No hay usuarios finales
- No hay multi-tenant
- No hay roles complejos
- Seguridad estricta por defecto

------------------------------------------------------------
AUTHENTICATION (SUPABASE AUTH)
------------------------------------------------------------

- Se utiliza Supabase Auth
- Login por email + password
- Las cuentas se crean manualmente
- No existe registro público
- No existe login desde el POS

El POS NO usa Supabase Auth.

------------------------------------------------------------
MODELO DE ADMINS
------------------------------------------------------------

Se utiliza una tabla explícita para identificar administradores.
Esto evita hardcodear emails en policies y permite escalar luego.

TABLE: admins

admins (
  user_id uuid primary key references auth.users(id),
  email text unique not null,
  created_at timestamptz default now()
)

Solo los usuarios presentes en esta tabla son considerados admins.

------------------------------------------------------------
FUNCIÓN BASE: is_admin()
------------------------------------------------------------

Función reusable para todas las policies.

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from admins
    where user_id = auth.uid()
  );
$$;

------------------------------------------------------------
REGLA GENERAL DE SEGURIDAD
------------------------------------------------------------

- Todas las tablas del sistema de licencias y pagos:
  - SOLO accesibles por admins
- El acceso se define por RLS
- El frontend nunca decide permisos

------------------------------------------------------------
POLICIES POR TABLA
------------------------------------------------------------

TABLE: customers

create policy "admins_full_access_customers"
on customers
for all
using (is_admin());

------------------------------------------------------------

TABLE: plans

create policy "admins_full_access_plans"
on plans
for all
using (is_admin());

------------------------------------------------------------

TABLE: licenses

create policy "admins_full_access_licenses"
on licenses
for all
using (is_admin());

------------------------------------------------------------

TABLE: license_devices

create policy "admins_full_access_license_devices"
on license_devices
for all
using (is_admin());

------------------------------------------------------------

TABLE: payments

create policy "admins_full_access_payments"
on payments
for all
using (is_admin());

------------------------------------------------------------

TABLE: audit_logs

create policy "admins_read_audit_logs"
on audit_logs
for select
using (is_admin());

------------------------------------------------------------

TABLE: telemetry_heartbeats

create policy "admins_read_telemetry"
on telemetry_heartbeats
for select
using (is_admin());

------------------------------------------------------------
EDGE FUNCTIONS Y RLS
------------------------------------------------------------

- Las Edge Functions usan el Service Role
- El Service Role bypassa RLS
- Toda lógica sensible vive en Edge Functions
- El frontend solo consume endpoints

------------------------------------------------------------
REGLAS NO NEGOCIABLES
------------------------------------------------------------

- Ninguna tabla sensible sin RLS
- Ningún endpoint crítico sin auditoría
- Ninguna acción de licencias desde el cliente
- Ninguna validación de estado en el POS

------------------------------------------------------------
ESCALADO FUTURO A MULTI-TENANT
------------------------------------------------------------

Cambios necesarios:
- Agregar tenant_id a todas las tablas
- Agregar tenant_id a admins
- Cambiar is_admin() por is_admin_for_tenant()
- Ajustar policies con tenant_id

La estructura actual lo permite sin reescritura.

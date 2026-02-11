# Modelo de Datos — Licencias + Pagos

Este archivo define el modelo de datos completo del sub-sistema
Licencias + Pagos para Punto de Venta 2026.

Alcance:
- Diseño MVP
- Sin multi-tenant
- Sin múltiples empresas
- Sin roles complejos
- Preparado para escalar sin reescritura

Principios:
- El POS no es fuente de verdad
- Las licencias se validan en backend
- Toda acción sensible queda auditada
- No se eliminan datos contables

------------------------------------------------------------
TABLE: customers
Clientes que utilizan el POS.
No son usuarios del sistema de licencias.
------------------------------------------------------------

customers (
  id uuid primary key,
  name text not null,
  email text,
  created_at timestamptz default now()
)

------------------------------------------------------------
TABLE: plans
Define duración y límites del uso del sistema.
------------------------------------------------------------

plans (
  id uuid primary key,
  name text not null,
  duration_days integer not null,
  limits jsonb not null,
  created_at timestamptz default now()
)

limits example:
{
  "maxDevices": 1,
  "maxInvoices": 50,
  "modules": ["core"]
}

------------------------------------------------------------
TABLE: licenses
Entidad central del sistema de licencias.
------------------------------------------------------------

licenses (
  id uuid primary key,
  customer_id uuid references customers(id),
  plan_id uuid references plans(id),
  status text check (status in ('trial','active','expired','blocked')),
  expires_at timestamptz not null,
  grace_until timestamptz,
  signature text not null,
  created_at timestamptz default now()
)

------------------------------------------------------------
TABLE: license_devices
Dispositivos activados para una licencia.
------------------------------------------------------------

license_devices (
  id uuid primary key,
  license_id uuid references licenses(id),
  device_fingerprint text not null,
  activated_at timestamptz default now(),
  revoked_at timestamptz,
  unique (license_id, device_fingerprint)
)

------------------------------------------------------------
TABLE: payments
Registro de pagos (agnóstico al proveedor).
------------------------------------------------------------

payments (
  id uuid primary key,
  customer_id uuid references customers(id),
  provider text not null,
  provider_ref text not null,
  amount numeric not null,
  status text check (status in ('pending','approved','rejected')),
  idempotency_key text unique,
  created_at timestamptz default now(),
  unique (provider, provider_ref)
)

------------------------------------------------------------
TABLE: audit_logs
Auditoría obligatoria del sistema.
------------------------------------------------------------

audit_logs (
  id uuid primary key,
  action text not null,
  entity text not null,
  entity_id uuid,
  actor text not null,
  metadata jsonb,
  created_at timestamptz default now()
)

------------------------------------------------------------
TABLE: telemetry_heartbeats
Telemetría mínima del POS.
------------------------------------------------------------

telemetry_heartbeats (
  id uuid primary key,
  license_id uuid references licenses(id),
  device_fingerprint text,
  last_seen_at timestamptz not null
)

------------------------------------------------------------
INDEXES
------------------------------------------------------------

create index on licenses (customer_id);
create index on licenses (expires_at);
create unique index on payments (provider, provider_ref);
create unique index on license_devices (license_id, device_fingerprint);

------------------------------------------------------------
ESCALADO FUTURO A MULTI-TENANT
------------------------------------------------------------

Cambios necesarios:
- Agregar tenant_id a:
  customers
  plans
  licenses
  payments
- Aplicar RLS por tenant
- Asociar admins a tenant

El modelo no requiere rediseño.

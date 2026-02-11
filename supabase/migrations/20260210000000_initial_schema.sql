-- Migration: Initial Schema for Licenses and Payments Sub-system
-- Description: Creates tables for customers, plans, licenses, devices, payments, audit_logs, and telemetry.
--              Enables RLS on all tables.
--              Sets up indexes and constraints (including no-delete on payments).

-- ------------------------------------------------------------
-- 1. Customers
-- ------------------------------------------------------------
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text UNIQUE,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE customers IS 'Clientes que utilizan el POS. No son usuarios del sistema de licencias.';

-- ------------------------------------------------------------
-- 2. Plans
-- ------------------------------------------------------------
CREATE TABLE plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    duration_days integer NOT NULL,
    limits jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE plans IS 'Define duración y límites del uso del sistema.';
COMMENT ON COLUMN plans.limits IS 'JSONB con límites como maxDevices, maxInvoices, modules, etc.';

-- ------------------------------------------------------------
-- 3. Licenses
-- ------------------------------------------------------------
CREATE TABLE licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) NOT NULL,
    plan_id uuid REFERENCES plans(id) NOT NULL,
    status text CHECK (status IN ('trial', 'active', 'expired', 'blocked')) NOT NULL,
    expires_at timestamptz NOT NULL,
    grace_until timestamptz,
    signature text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX idx_licenses_expires_at ON licenses(expires_at);

COMMENT ON TABLE licenses IS 'Entidad central del sistema de licencias.';
COMMENT ON COLUMN licenses.signature IS 'Firma criptográfica para validar la licencia offline/online.';

-- ------------------------------------------------------------
-- 4. License Devices
-- ------------------------------------------------------------
CREATE TABLE license_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id uuid REFERENCES licenses(id) NOT NULL,
    device_fingerprint text NOT NULL,
    activated_at timestamptz DEFAULT now(),
    revoked_at timestamptz,
    UNIQUE (license_id, device_fingerprint)
);

ALTER TABLE license_devices ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE license_devices IS 'Dispositivos activados para una licencia específica.';

-- ------------------------------------------------------------
-- 5. Payments
-- ------------------------------------------------------------
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) NOT NULL,
    provider text NOT NULL,
    provider_ref text NOT NULL,
    amount numeric NOT NULL,
    status text CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    idempotency_key text UNIQUE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (provider, provider_ref)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Rule: payments NO se elimina nunca.
-- Using RLS to enforce this blocking DELETE for everyone.
CREATE POLICY "Prevent delete of payments" ON payments
    FOR DELETE
    USING (false);

COMMENT ON TABLE payments IS 'Registro de pagos. Inmutable (no se permite DELETE).';

-- ------------------------------------------------------------
-- 6. Audit Logs
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    actor text NOT NULL,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE audit_logs IS 'Auditoría obligatoria de acciones sensibles del sistema.';

-- ------------------------------------------------------------
-- 7. Telemetry Heartbeats
-- ------------------------------------------------------------
CREATE TABLE telemetry_heartbeats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id uuid REFERENCES licenses(id),
    device_fingerprint text,
    last_seen_at timestamptz NOT NULL
);

ALTER TABLE telemetry_heartbeats ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE telemetry_heartbeats IS 'Telemetría mínima para seguimiento de actividad de dispositivos.';

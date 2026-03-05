-- Migration: Admin Security & RLS
-- Description: Implements the admin security model using Supabase Auth + RLS.
--              Creates 'admins' table, 'is_admin()' function, and sets up RLS policies.

-- ------------------------------------------------------------
-- 1. Admins Table
-- ------------------------------------------------------------
CREATE TABLE admins (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE admins IS 'Tabla de administradores del sistema. Relación 1:1 con auth.users.';

-- ------------------------------------------------------------
-- 2. Helper Function: is_admin()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.admins
        WHERE id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION is_admin IS 'Retorna true si el usuario actual (auth.uid) existe en la tabla public.admins.';

-- ------------------------------------------------------------
-- 3. RLS Policies
-- ------------------------------------------------------------

-- Enable RLS on all tables (idempotent if already enabled, but good practice to be explicit)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_heartbeats ENABLE ROW LEVEL SECURITY;

-- -- Admins Table --
CREATE POLICY "Admins have full access to admins table" ON admins
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- Customers --
CREATE POLICY "Admins have full access to customers" ON customers
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- Plans --
CREATE POLICY "Admins have full access to plans" ON plans
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- Licenses --
CREATE POLICY "Admins have full access to licenses" ON licenses
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- License Devices --
CREATE POLICY "Admins have full access to license_devices" ON license_devices
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- Payments --
-- NOTE: Previous migration might have a deny-all DELETE policy.
-- We are adding a policy that allows everything for admins.
-- If the previous policy was restrictive, this wouldn't override it. 
-- But standard policies are permissive (OR). So checks: (Deny or Allow) -> Allow.
CREATE POLICY "Admins have full access to payments" ON payments
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- -- Audit Logs --
-- Read-only for admins (and insert if needed by app logic, typically logs are inserted by triggers or service role, but allowing admin insert for manual logging if needed)
CREATE POLICY "Admins can view audit_logs" ON audit_logs
    FOR SELECT
    USING (is_admin());

-- If admins need to manually insert logs via frontend:
CREATE POLICY "Admins can insert audit_logs" ON audit_logs
    FOR INSERT
    WITH CHECK (is_admin());

-- -- Telemetry Heartbeats --
CREATE POLICY "Admins can view telemetry_heartbeats" ON telemetry_heartbeats
    FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert telemetry_heartbeats" ON telemetry_heartbeats
    FOR INSERT
    WITH CHECK (is_admin());


-- ------------------------------------------------------------
-- 4. Seed Data (Admins)
-- ------------------------------------------------------------
-- Inserting the 2 internal admins.
-- The actual auth users must be created in the Auth service/dashboard with these IDs.

-- INSERT INTO admins (id) VALUES
--    ('00000000-0000-0000-0000-000000000001'),
--    ('00000000-0000-0000-0000-000000000002');


-- ------------------------------------------------------------
-- 5. Validation Queries (Comments)
-- ------------------------------------------------------------
/*
-- CASO 1: Admin (auth.uid() is in admins table)
-- Expected: Returns rows
SELECT * FROM customers;
INSERT INTO plans (name, duration_days, limits) VALUES ('Test Plan', 30, '{}'); -- Should work

-- CASO 2: Non-Admin (auth.uid() is VALID user but NOT in admins table)
-- Expected: Returns 0 rows (Select) / Error or 0 rows affected (Insert/Update)
SELECT * FROM customers; -- Should be empty
INSERT INTO plans (name, duration_days, limits) VALUES ('Hacker Plan', 999, '{}'); -- Should fail (RLS violation)

-- CASO 3: Anonymous (no auth)
-- Expected: Returns 0 rows / Error
SELECT * FROM customers;
*/

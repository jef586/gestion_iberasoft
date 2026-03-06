-- Migration: Add License Token Fields
-- Description: Adds license_key, license_token, and related fields to licenses table.

-- 1. Add new columns
ALTER TABLE licenses 
ADD COLUMN license_key text,
ADD COLUMN license_token text,
ADD COLUMN token_version integer DEFAULT 1,
ADD COLUMN issued_at timestamptz DEFAULT now(),
ADD COLUMN revoked_at timestamptz;

-- 2. Populate license_key for existing records
-- Strategy: Use a segment of the UUID or a generated string. 
-- For simplicity and uniqueness, we'll use a substring of the md5 of the id + random.
-- But to be cleaner, let's just use the ID as the key for existing ones, or generate a random string.
-- User suggested "license_key (string único, público)".
-- Let's generate a random 16-char alphanumeric string.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    r RECORD;
    new_key TEXT;
BEGIN
    FOR r IN SELECT id FROM licenses WHERE license_key IS NULL LOOP
        -- Generate a random string (simplified)
        new_key := substring(encode(digest(random()::text, 'sha256'), 'hex') from 1 for 16);
        
        -- Update the record
        UPDATE licenses SET license_key = new_key WHERE id = r.id;
    END LOOP;
END $$;

-- 3. Enforce constraints
ALTER TABLE licenses ALTER COLUMN license_key SET NOT NULL;
ALTER TABLE licenses ADD CONSTRAINT licenses_license_key_key UNIQUE (license_key);

-- 4. Add index for fast lookup by license_key
CREATE INDEX idx_licenses_license_key ON licenses(license_key);

COMMENT ON COLUMN licenses.license_key IS 'Clave pública de la licencia (human-friendly o system-friendly) para validar.';
COMMENT ON COLUMN licenses.license_token IS 'Token JWT-like firmado (HMAC) para validación offline.';

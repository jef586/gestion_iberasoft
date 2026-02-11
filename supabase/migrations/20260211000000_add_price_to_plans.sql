-- Migration: Add price fields to plans
-- Description: Adds price_amount and currency columns to plans table.

ALTER TABLE plans 
ADD COLUMN price_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN currency text NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN plans.price_amount IS 'Precio del plan en la moneda especificada (centavos o unidades según currency).';
COMMENT ON COLUMN plans.currency IS 'Código de moneda ISO 4217 (ej: USD, ARS).';

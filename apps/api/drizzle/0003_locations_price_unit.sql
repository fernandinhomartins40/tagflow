ALTER TABLE locations
ADD COLUMN IF NOT EXISTS price_unit text NOT NULL DEFAULT 'hour';

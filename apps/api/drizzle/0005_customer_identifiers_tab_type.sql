ALTER TABLE customer_identifiers
ADD COLUMN IF NOT EXISTS tab_type TEXT NOT NULL DEFAULT 'prepaid';

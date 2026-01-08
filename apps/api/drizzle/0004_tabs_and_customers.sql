ALTER TABLE customers
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE customer_identifiers
ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid,
  customer_id uuid NOT NULL,
  identifier_code text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS tab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tab_id uuid NOT NULL,
  product_id uuid,
  service_id uuid,
  location_id uuid,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tab_item_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tab_item_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL
);

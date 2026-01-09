CREATE TABLE IF NOT EXISTS credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  cash_register_id uuid,
  method text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

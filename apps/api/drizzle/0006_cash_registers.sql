CREATE TABLE IF NOT EXISTS cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid,
  opened_by uuid,
  closed_by uuid,
  status text NOT NULL,
  opening_float numeric(12, 2) NOT NULL DEFAULT '0',
  closing_float numeric(12, 2),
  total_cash numeric(12, 2) NOT NULL DEFAULT '0',
  total_debit numeric(12, 2) NOT NULL DEFAULT '0',
  total_credit numeric(12, 2) NOT NULL DEFAULT '0',
  total_pix numeric(12, 2) NOT NULL DEFAULT '0',
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS tab_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  tab_id uuid NOT NULL,
  cash_register_id uuid,
  method text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

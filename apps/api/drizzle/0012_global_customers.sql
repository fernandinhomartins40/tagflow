CREATE TABLE IF NOT EXISTS "global_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "cpf" text NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "global_customers_cpf_unique" ON "global_customers" ("cpf");
CREATE UNIQUE INDEX IF NOT EXISTS "global_customers_phone_unique" ON "global_customers" ("phone");

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "global_customer_id" uuid;

CREATE INDEX IF NOT EXISTS "customers_global_customer_id_idx" ON "customers" ("global_customer_id");

CREATE TABLE IF NOT EXISTS "plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "price_monthly" numeric(12, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'brl',
  "stripe_price_id" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "company_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "plan_id" uuid REFERENCES "plans"("id") ON DELETE SET NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "status" text,
  "current_period_end" timestamp with time zone,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_subscriptions_company_id_idx" ON "company_subscriptions" ("company_id");
CREATE INDEX IF NOT EXISTS "plans_name_idx" ON "plans" ("name");

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_company ON push_subscriptions(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_company_endpoint ON push_subscriptions(company_id, endpoint);

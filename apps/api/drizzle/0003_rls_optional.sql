-- Optional Row Level Security (RLS) setup
-- Enable only if you manage roles per tenant and set the app.tenant_id session var.

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_companies ON companies
  USING (id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_branches ON branches
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_users ON users
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_customers ON customers
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_identifiers ON customer_identifiers
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_products ON products
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_services ON services
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_locations ON locations
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_bookings ON bookings
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_booking_participants ON booking_participants
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_transactions ON transactions
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_consumption ON consumption_items
  USING (company_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_push_subs ON push_subscriptions
  USING (company_id::text = current_setting('app.tenant_id', true));

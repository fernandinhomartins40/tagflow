-- Seed demo company and admin
INSERT INTO companies (id, name, cnpj, plan, status, theme)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Tagflow', '00.000.000/0001-00', 'demo', 'active', 'sunset')
ON CONFLICT DO NOTHING;

INSERT INTO users (company_id, name, email, password_hash, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Admin Demo',
  'admin@tagflow.local',
  '$2a$10$k6gP4v6dD6wB.s8oB6eVYOf7cJ9FSmr5Z8FjzEJ6nZsrqMZPp9Mlu',
  'super_admin'
)
ON CONFLICT DO NOTHING;

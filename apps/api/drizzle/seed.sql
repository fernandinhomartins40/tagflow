-- Seed demo company and admin
INSERT INTO companies (id, name, cnpj, plan, status, theme)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Tagflow', '00.000.000/0001-00', 'Prime', 'active', 'sunset')
ON CONFLICT DO NOTHING;

INSERT INTO users (company_id, name, email, password_hash, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Admin Demo',
  'admin@tagflow.local',
  '$2a$10$h5dxqNt8IwNITbakJmMxieJ.axbbEzJhLo.GBXm95cKdelCGQGP36',
  'super_admin'
)
ON CONFLICT DO NOTHING;

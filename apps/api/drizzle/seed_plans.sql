INSERT INTO plans (name, description, price_monthly, currency, features, tools, limits, active)
SELECT
  'Free',
  'Entrada com limite basico.',
  '0.00',
  'brl',
  '["PDV basico","Reservas essenciais","Relatorios simples"]',
  '[]',
  '["1 filial","1 operador","100 clientes","5 reservas/mes"]',
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Free');

INSERT INTO plans (name, description, price_monthly, currency, features, tools, limits, active)
SELECT
  'Start',
  'Operacao inicial completa.',
  '199.00',
  'brl',
  '["PDV completo","NFC e codigo de barras","Relatorios padrao"]',
  '[]',
  '["2 filiais","5 operadores","2.000 clientes"]',
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Start');

INSERT INTO plans (name, description, price_monthly, currency, features, tools, limits, active)
SELECT
  'Growth',
  'Escala e recursos avancados.',
  '399.00',
  'brl',
  '["Divisao de contas","Indicadores ao vivo","Equipe dedicada"]',
  '[]',
  '["5 filiais","15 operadores","10.000 clientes"]',
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Growth');

INSERT INTO plans (name, description, price_monthly, currency, features, tools, limits, active)
SELECT
  'Enterprise',
  'Plano sob medida.',
  '0.00',
  'brl',
  '["Ambiente isolado","SLA e auditoria","Customizacoes"]',
  '[]',
  '["Filiais ilimitadas","Usuarios ilimitados"]',
  true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Enterprise');

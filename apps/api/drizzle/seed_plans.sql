-- Delete old plans that are no longer used
DELETE FROM plans WHERE name IN ('Growth', 'Enterprise');

-- Upsert Free plan
INSERT INTO plans (name, description, price_monthly, currency, stripe_price_id, features, tools, limits, active)
VALUES (
  'Free',
  'Comece gratuitamente com recursos essenciais.',
  '0.00',
  'brl',
  NULL,
  '["PDV basico","Gestao de clientes","Relatorios simples"]',
  '["NFC e codigo de barras","Comandas basicas","Notificacoes push"]',
  '["1 filial","2 usuarios","100 clientes","10 reservas/mes"]',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  stripe_price_id = EXCLUDED.stripe_price_id,
  features = EXCLUDED.features,
  tools = EXCLUDED.tools,
  limits = EXCLUDED.limits,
  active = EXCLUDED.active;

-- Upsert Start plan
INSERT INTO plans (name, description, price_monthly, currency, stripe_price_id, features, tools, limits, active)
VALUES (
  'Start',
  'Ideal para pequenas operacoes em crescimento.',
  '97.00',
  'brl',
  'price_1SoZ0HDGSJXgT11Uw5ymYOOf',
  '["PDV completo","Gestao de estoque","Relatorios avancados","Controle de caixa"]',
  '["NFC e codigo de barras","Comandas multiplas","Notificacoes push","Backup automatico"]',
  '["2 filiais","5 usuarios","1.000 clientes","100 reservas/mes"]',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  stripe_price_id = EXCLUDED.stripe_price_id,
  features = EXCLUDED.features,
  tools = EXCLUDED.tools,
  limits = EXCLUDED.limits,
  active = EXCLUDED.active;

-- Upsert Prime plan
INSERT INTO plans (name, description, price_monthly, currency, stripe_price_id, features, tools, limits, active)
VALUES (
  'Prime',
  'Recursos premium para maxima performance.',
  '197.00',
  'brl',
  'price_1SoZ0kDGSJXgT11U1ZkZx6Mb',
  '["Todos os recursos do Start","Relatorios avancados e dashboards","Divisao de contas/comandas","API e integracoes","Suporte prioritario"]',
  '["Analytics em tempo real","Automacao de processos","Webhooks personalizados","Exportacao de dados"]',
  '["5 filiais","20 usuarios","10.000 clientes","1.000 reservas/mes"]',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  stripe_price_id = EXCLUDED.stripe_price_id,
  features = EXCLUDED.features,
  tools = EXCLUDED.tools,
  limits = EXCLUDED.limits,
  active = EXCLUDED.active;

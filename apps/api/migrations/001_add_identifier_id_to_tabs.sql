-- Adicionar coluna identifier_id à tabela tabs
ALTER TABLE tabs ADD COLUMN identifier_id uuid REFERENCES customer_identifiers(id);

-- Criar índice para melhor performance
CREATE INDEX idx_tabs_identifier_id ON tabs(identifier_id);

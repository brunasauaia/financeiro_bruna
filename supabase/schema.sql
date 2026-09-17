-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('gasto', 'entrada')),
  display_order INT NOT NULL DEFAULT 0
);

INSERT INTO categories (name, type, display_order) VALUES
  ('Assinaturas', 'gasto', 1),
  ('Supermercado', 'gasto', 2),
  ('Carro Bru', 'gasto', 3),
  ('Carro João', 'gasto', 4),
  ('Ifood', 'gasto', 5),
  ('Manicure', 'gasto', 6),
  ('Esportes', 'gasto', 7),
  ('Educação', 'gasto', 8),
  ('Contas Casa', 'gasto', 9),
  ('Farmácia', 'gasto', 10),
  ('Saúde', 'gasto', 11),
  ('Compras Bru', 'gasto', 12),
  ('Compras João', 'gasto', 13),
  ('Presentes', 'gasto', 14),
  ('Viagem', 'gasto', 15),
  ('Reembolso', 'gasto', 16),
  ('Alfredo', 'gasto', 17),
  ('Outros Gastos', 'gasto', 18),
  ('Manutenção Casa', 'gasto', 19),
  ('Lazer', 'gasto', 20),
  ('Uber', 'gasto', 21),
  ('Salário', 'entrada', 1),
  ('Reembolso recebido', 'entrada', 2),
  ('Outros créditos', 'entrada', 3),
  ('Aporte', 'entrada', 4)
ON CONFLICT (name) DO NOTHING;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gasto', 'reembolsavel', 'entrada')),
  category_id INT NOT NULL REFERENCES categories(id),
  person TEXT NOT NULL CHECK (person IN ('bruna', 'joao', 'casal')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reimbursed BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursement_entry_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash positions (one per month/year)
CREATE TABLE IF NOT EXISTS cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  nubank_bruna NUMERIC(10,2) NOT NULL DEFAULT 0,
  nubank_joao NUMERIC(10,2) NOT NULL DEFAULT 0,
  fatura_nubank_bruna NUMERIC(10,2) NOT NULL DEFAULT 0,
  fatura_nubank_joao NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Notes (single global row)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_1 TEXT,
  note_2 TEXT,
  note_3 TEXT,
  note_4 TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the one and only notes row
INSERT INTO notes (note_1, note_2, note_3, note_4) VALUES (NULL, NULL, NULL, NULL);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER cash_positions_updated_at
  BEFORE UPDATE ON cash_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  ('Aluguel', 'gasto', 1),
  ('Supermercado', 'gasto', 2),
  ('Nina', 'gasto', 3),
  ('Subscriptions', 'gasto', 4),
  ('Carro', 'gasto', 5),
  ('Uber', 'gasto', 6),
  ('Alimentação Fora', 'gasto', 7),
  ('Ifood/Rappi', 'gasto', 8),
  ('Saúde/Bem Estar', 'gasto', 9),
  ('Esportes', 'gasto', 10),
  ('Manicure', 'gasto', 11),
  ('Cabelo', 'gasto', 12),
  ('Farmacia', 'gasto', 13),
  ('Psicologo', 'gasto', 14),
  ('Dentista/Médico', 'gasto', 15),
  ('Inglês', 'gasto', 16),
  ('Mimos', 'gasto', 17),
  ('Compras', 'gasto', 18),
  ('Presentes', 'gasto', 19),
  ('Viagem', 'gasto', 20),
  ('Extras', 'gasto', 21),
  ('Aporte', 'gasto', 22),
  ('Salário', 'entrada', 1),
  ('Reembolso recebido', 'entrada', 2),
  ('Outros créditos', 'entrada', 3)
ON CONFLICT (name) DO NOTHING;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gasto', 'reembolsavel', 'entrada')),
  category_id INT NOT NULL REFERENCES categories(id),
  person TEXT NOT NULL CHECK (person IN ('pedro', 'ana', 'casal')),
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
  itau_pedro NUMERIC(10,2) NOT NULL DEFAULT 0,
  nubank_ana NUMERIC(10,2) NOT NULL DEFAULT 0,
  fatura_itau_pedro NUMERIC(10,2) NOT NULL DEFAULT 0,
  fatura_nubank_ana NUMERIC(10,2) NOT NULL DEFAULT 0,
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

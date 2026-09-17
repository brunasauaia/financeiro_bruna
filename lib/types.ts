export type TransactionType = 'gasto' | 'reembolsavel' | 'entrada'
export type Person = 'bruna' | 'joao' | 'casal'
export type CategoryType = 'gasto' | 'entrada'

export interface Category {
  id: number
  name: string
  type: CategoryType
  display_order: number
}

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  category_id: number
  person: Person
  amount: number
  description: string | null
  reimbursed: boolean
  reimbursement_entry_id: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface CashPosition {
  id: string
  year: number
  month: number
  nubank_bruna: number
  nubank_joao: number
  fatura_nubank_bruna: number
  fatura_nubank_joao: number
  created_at: string
  updated_at: string
}

export interface Notes {
  id: string
  note_1: string | null
  note_2: string | null
  note_3: string | null
  note_4: string | null
  updated_at: string
}

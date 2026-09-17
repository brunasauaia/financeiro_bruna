export type TransactionType = 'gasto' | 'reembolsavel' | 'entrada'
export type Person = 'pedro' | 'ana' | 'casal'
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
  itau_pedro: number
  nubank_ana: number
  fatura_itau_pedro: number
  fatura_nubank_ana: number
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

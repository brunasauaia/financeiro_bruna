export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export const PEOPLE = [
  { value: 'bruna', label: 'Bruna' },
  { value: 'joao', label: 'João' },
  { value: 'casal', label: 'Casal' },
] as const

export const PERSON_LABELS: Record<string, string> = {
  bruna: 'Bruna',
  joao: 'João',
  casal: 'Casal',
}

export const TRANSACTION_TYPES = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'reembolsavel', label: 'Reembolsável' },
  { value: 'entrada', label: 'Entrada' },
] as const

export const TYPE_LABELS: Record<string, string> = {
  gasto: 'Gasto',
  reembolsavel: 'Reembolsável',
  entrada: 'Entrada',
}

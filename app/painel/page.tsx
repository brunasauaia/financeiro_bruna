'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Category, Transaction, CashPosition } from '@/lib/types'
import { MONTHS, MONTH_ABBR } from '@/lib/constants'
import { formatCurrency, getLastDayOfMonth } from '@/lib/utils'
import DrilldownModal from '@/components/DrilldownModal'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface DrilldownState {
  categoryName: string
  month: number
  transactions: Transaction[]
}

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const CATEGORY_GROUPS = [
  { label: 'Moradia',       categories: ['Contas Casa', 'Manutenção Casa', 'Assinaturas', 'Alfredo'] },
  { label: 'Alimentação',   categories: ['Supermercado', 'Ifood'] },
  { label: 'Transporte',    categories: ['Carro Bru', 'Carro João', 'Uber'] },
  { label: 'Saúde/Beleza',  categories: ['Saúde', 'Esportes', 'Farmácia', 'Manicure'] },
  { label: 'Pessoal',       categories: ['Compras Bru', 'Compras João', 'Presentes', 'Viagem', 'Lazer', 'Educação'] },
  { label: 'Outros',        categories: ['Outros Gastos'] },
  { label: 'Reembolsos',    categories: ['Reembolso'] },
]

export default function PainelPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [person, setPerson] = useState('todos')

  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [cashPosition, setCashPosition] = useState<CashPosition | null>(null)
  const [reembolsosPendentes, setReembolsosPendentes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [drilldown, setDrilldown] = useState<DrilldownState | null>(null)

  // For past years show all 12 months; for current year show up to selected month
  const isPastYear = year < CURRENT_YEAR
  const lastMonth = isPastYear ? 12 : month
  const monthNumbers = Array.from({ length: lastMonth }, (_, i) => i + 1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const endDate = getLastDayOfMonth(year, isPastYear ? 12 : month)
    const startDate = `${year}-01-01`

    // Paginate transactions to avoid the 1000-row default limit
    async function fetchAllTransactions() {
      const allTx: Transaction[] = []
      const pageSize = 1000
      let from = 0
      while (true) {
        const { data } = await supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .range(from, from + pageSize - 1)
        if (!data || data.length === 0) break
        allTx.push(...(data as Transaction[]))
        if (data.length < pageSize) break
        from += pageSize
      }
      return allTx
    }

    const [catRes, allTx, cpRes, reembRes] = await Promise.all([
      supabase.from('categories').select('*').order('type').order('display_order'),
      fetchAllTransactions(),
      supabase
        .from('cash_positions')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle(),
      supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'reembolsavel')
        .eq('reimbursed', false),
    ])

    if (catRes.data) setCategories(catRes.data)
    setTransactions(allTx)
    setCashPosition(cpRes.data ?? null)
    setReembolsosPendentes(
      (reembRes.data ?? []).reduce((s, t) => s + t.amount, 0)
    )
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredTx = transactions.filter((tx) => {
    if (person === 'todos') return true
    return tx.person === person
  })

  const expenseCategories = categories.filter((c) => c.type === 'gasto')

  // Build category × month matrix
  const matrix: Record<string, Record<number, number>> = {}
  for (const cat of expenseCategories) {
    matrix[cat.name] = {}
    for (const m of monthNumbers) matrix[cat.name][m] = 0
  }

  for (const tx of filteredTx) {
    if (tx.type === 'entrada') continue
    if (tx.reimbursed) continue
    const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
    const catName = tx.category?.name
    if (catName && matrix[catName] !== undefined) {
      matrix[catName][m] = (matrix[catName][m] || 0) + tx.amount
    }
  }

  // Monthly summaries
  let saldoAcumulado = 0
  const summary: Record<number, { gastos: number; entradas: number; saldo: number; acum: number }> = {}

  for (const m of monthNumbers) {
    const gastos = filteredTx
      .filter((tx) => {
        const txMonth = new Date(tx.date + 'T00:00:00').getMonth() + 1
        return txMonth === m && (tx.type === 'gasto' || tx.type === 'reembolsavel') && !tx.reimbursed
      })
      .reduce((s, tx) => s + tx.amount, 0)

    const entradas = filteredTx
      .filter((tx) => {
        const txMonth = new Date(tx.date + 'T00:00:00').getMonth() + 1
        return txMonth === m && tx.type === 'entrada'
      })
      .reduce((s, tx) => s + tx.amount, 0)

    const saldo = entradas - gastos
    saldoAcumulado += saldo
    summary[m] = { gastos, entradas, saldo, acum: saldoAcumulado }
  }

  const saldoReal = cashPosition
    ? cashPosition.nubank_bruna +
      cashPosition.nubank_joao -
      cashPosition.fatura_nubank_bruna -
      cashPosition.fatura_nubank_joao
    : null

  const saldoCalculado = summary[month]?.acum ?? 0
  const diferenca = saldoReal !== null ? saldoCalculado - saldoReal : null

  function handleCellClick(categoryName: string, m: number) {
    const cellTx = filteredTx.filter((tx) => {
      const txMonth = new Date(tx.date + 'T00:00:00').getMonth() + 1
      return (
        tx.category?.name === categoryName &&
        txMonth === m &&
        (tx.type === 'gasto' || tx.type === 'reembolsavel')
      )
    })
    setDrilldown({ categoryName, month: m, transactions: cellTx })
  }

  function handleEntradasClick(m: number) {
    const cellTx = filteredTx.filter((tx) => {
      const txMonth = new Date(tx.date + 'T00:00:00').getMonth() + 1
      return txMonth === m && tx.type === 'entrada'
    })
    setDrilldown({ categoryName: 'Entradas', month: m, transactions: cellTx })
  }

  function numColor(value: number, invertSign = false) {
    const v = invertSign ? -value : value
    if (v > 0) return 'text-emerald-600'
    if (v < 0) return 'text-red-600'
    return 'text-slate-400'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-xl font-bold text-slate-800 mr-auto">Painel</h1>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          <option value="todos">Todos</option>
          <option value="bruna">Bruna</option>
          <option value="joao">João</option>
          <option value="casal">Casal</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Carregando...
        </div>
      ) : (
        <>
          {/* Verification card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
              Verificação de Saldo — {MONTHS[month - 1]} {year}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Saldo Acumulado (calculado)</p>
                <p className={`text-lg font-bold tabular-nums ${numColor(saldoCalculado)}`}>
                  {formatCurrency(saldoCalculado)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Saldo Real de Caixa</p>
                {saldoReal !== null ? (
                  <p className={`text-lg font-bold tabular-nums ${numColor(saldoReal)}`}>
                    {formatCurrency(saldoReal)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Não informado</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Caixa + Reembolsos</p>
                {saldoReal !== null ? (
                  <>
                    <p className={`text-lg font-bold tabular-nums ${numColor(saldoReal + reembolsosPendentes)}`}>
                      {formatCurrency(saldoReal + reembolsosPendentes)}
                    </p>
                    {reembolsosPendentes > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        + {formatCurrency(reembolsosPendentes)} a receber
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">Não informado</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Diferença</p>
                {diferenca !== null ? (
                  <div className="flex items-center gap-2">
                    {Math.abs(diferenca) <= 10 ? (
                      <CheckCircle size={18} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-500" />
                    )}
                    <p className={`text-lg font-bold tabular-nums ${Math.abs(diferenca) <= 10 ? 'text-emerald-600' : numColor(diferenca)}`}>
                      {formatCurrency(diferenca)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Category × Month table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 border-b border-blue-700">
                  <th className="text-left px-4 py-3 text-blue-100 font-medium sticky left-0 bg-blue-600 min-w-[160px]">
                    Categoria
                  </th>
                  {monthNumbers.map((m) => (
                    <th key={m} className="text-right px-3 py-3 text-blue-100 font-medium min-w-[90px]">
                      {MONTH_ABBR[m - 1]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORY_GROUPS.map((group) => {
                  const groupCats = expenseCategories.filter(
                    (cat) =>
                      group.categories.includes(cat.name) &&
                      monthNumbers.some((m) => (matrix[cat.name]?.[m] ?? 0) > 0)
                  )
                  if (groupCats.length === 0) return null
                  return (
                    <Fragment key={group.label}>
                      <tr className="bg-slate-100 border-t border-b border-slate-200">
                        <td
                          className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-100"
                          colSpan={monthNumbers.length + 1}
                        >
                          {group.label}
                        </td>
                      </tr>
                      {groupCats.map((cat) => (
                        <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-slate-700 font-medium sticky left-0 bg-white">
                            {cat.name}
                          </td>
                          {monthNumbers.map((m) => {
                            const val = matrix[cat.name]?.[m] ?? 0
                            return (
                              <td
                                key={m}
                                onClick={() => val > 0 && handleCellClick(cat.name, m)}
                                className={`px-3 py-2.5 text-right tabular-nums transition-colors ${
                                  val > 0
                                    ? 'text-slate-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700'
                                    : 'text-slate-300'
                                }`}
                              >
                                {val > 0 ? formatCurrency(val) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}

                {/* Totals */}
                <tr className="border-t-2 border-slate-200 bg-blue-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-700 sticky left-0 bg-blue-50">
                    Total Gastos
                  </td>
                  {monthNumbers.map((m) => (
                    <td key={m} className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                      {summary[m]?.gastos > 0 ? formatCurrency(summary[m].gastos) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <td className="px-4 py-2.5 font-semibold text-emerald-700 sticky left-0 bg-blue-50">
                    Entradas
                  </td>
                  {monthNumbers.map((m) => {
                    const val = summary[m]?.entradas ?? 0
                    return (
                      <td
                        key={m}
                        onClick={() => val > 0 && handleEntradasClick(m)}
                        className={`px-3 py-2.5 text-right font-semibold tabular-nums transition-colors ${
                          val > 0
                            ? `${numColor(val)} cursor-pointer hover:bg-emerald-50 hover:text-emerald-700`
                            : 'text-slate-300'
                        }`}
                      >
                        {val > 0 ? formatCurrency(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
                <tr className="bg-blue-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-700 sticky left-0 bg-blue-50">
                    Saldo do Mês
                  </td>
                  {monthNumbers.map((m) => {
                    const val = summary[m]?.saldo ?? 0
                    return (
                      <td key={m} className={`px-3 py-2.5 text-right font-semibold tabular-nums ${numColor(val)}`}>
                        {summary[m] ? formatCurrency(val) : '—'}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {drilldown && (
        <DrilldownModal
          categoryName={drilldown.categoryName}
          month={drilldown.month}
          year={year}
          transactions={drilldown.transactions}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  )
}

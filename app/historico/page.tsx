'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction } from '@/lib/types'
import { MONTHS, PERSON_LABELS, TYPE_LABELS, TRANSACTION_TYPES, PEOPLE } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

export default function HistoricoPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [person, setPerson] = useState('todos')
  const [type, setType] = useState('todos')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    let query = supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (person !== 'todos') query = query.eq('person', person)
    if (type !== 'todos') query = query.eq('type', type)

    const { data } = await query
    setTransactions((data as Transaction[]) ?? [])
    setLoading(false)
  }, [year, month, person, type])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function handleDelete(tx: Transaction) {
    if (!confirm(`Excluir lançamento de ${formatCurrency(tx.amount)} (${tx.category?.name})?`)) return
    setDeletingId(tx.id)
    await supabase.from('transactions').delete().eq('id', tx.id)
    setTransactions((prev) => prev.filter((t) => t.id !== tx.id))
    setDeletingId(null)
  }

  const typeBadge: Record<string, string> = {
    gasto: 'bg-red-100 text-red-700',
    reembolsavel: 'bg-amber-100 text-amber-700',
    entrada: 'bg-emerald-100 text-emerald-700',
  }

  const totalGastos = transactions
    .filter((t) => t.type === 'gasto' || t.type === 'reembolsavel')
    .reduce((s, t) => s + t.amount, 0)
  const totalEntradas = transactions
    .filter((t) => t.type === 'entrada')
    .reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Histórico</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
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
          <option value="todos">Todas as pessoas</option>
          {PEOPLE.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          <option value="todos">Todos os tipos</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Totals pill */}
        <div className="ml-auto flex gap-3 text-sm items-center">
          <span className="text-slate-500">
            Gastos: <span className="font-semibold text-red-600">{formatCurrency(totalGastos)}</span>
          </span>
          <span className="text-slate-500">
            Entradas: <span className="font-semibold text-emerald-600">{formatCurrency(totalEntradas)}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Carregando...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Nenhum lançamento encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Pessoa</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                >
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[tx.type]}`}>
                      {TYPE_LABELS[tx.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{tx.category?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{PERSON_LABELS[tx.person]}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                    {tx.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(tx)}
                      disabled={deletingId === tx.id}
                      className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

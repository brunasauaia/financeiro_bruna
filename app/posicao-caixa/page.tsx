'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CashPosition } from '@/lib/types'
import { MONTHS } from '@/lib/constants'
import { formatCurrency, getLastDayOfMonth } from '@/lib/utils'
import { CheckCircle2, Wallet } from 'lucide-react'

const YEAR = new Date().getFullYear()
const MONTH = new Date().getMonth() + 1

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const LABEL = 'block text-xs font-medium text-slate-500 mb-1'

export default function PosicaoCaixaPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saldoCalculado, setSaldoCalculado] = useState<number | null>(null)

  const [form, setForm] = useState({
    nubank_bruna: '',
    nubank_joao: '',
    fatura_nubank_bruna: '',
    fatura_nubank_joao: '',
  })

  useEffect(() => {
    async function loadCashPosition() {
      // Try current month first; fall back to most recent record if none exists
      const { data: current } = await supabase
        .from('cash_positions')
        .select('*')
        .eq('year', YEAR)
        .eq('month', MONTH)
        .maybeSingle()

      const data = current ?? await supabase
        .from('cash_positions')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: d }) => d)

      if (data) {
        setForm({
          nubank_bruna: String(data.nubank_bruna),
          nubank_joao: String(data.nubank_joao),
          fatura_nubank_bruna: String(data.fatura_nubank_bruna),
          fatura_nubank_joao: String(data.fatura_nubank_joao),
        })
      }
    }
    loadCashPosition()

    supabase
      .from('transactions')
      .select('type, amount, date, reimbursed')
      .lte('date', getLastDayOfMonth(YEAR, MONTH))
      .then(({ data }) => {
        if (!data) return
        let acum = 0
        const byMonth: Record<string, { gastos: number; entradas: number }> = {}
        for (const tx of data) {
          const d = new Date(tx.date + 'T00:00:00')
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`
          if (!byMonth[key]) byMonth[key] = { gastos: 0, entradas: 0 }
          if (tx.type === 'entrada') byMonth[key].entradas += tx.amount
          else if (!tx.reimbursed) byMonth[key].gastos += tx.amount
        }
        for (const key of Object.keys(byMonth).sort()) {
          acum += byMonth[key].entradas - byMonth[key].gastos
        }
        setSaldoCalculado(acum)
      })
  }, [])

  const parseNum = (v: string) => parseFloat(v.replace(',', '.')) || 0

  const saldoReal =
    parseNum(form.nubank_bruna) +
    parseNum(form.nubank_joao) -
    parseNum(form.fatura_nubank_bruna) -
    parseNum(form.fatura_nubank_joao)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload: Omit<CashPosition, 'id' | 'created_at' | 'updated_at'> = {
      year: YEAR,
      month: MONTH,
      nubank_bruna: parseNum(form.nubank_bruna),
      nubank_joao: parseNum(form.nubank_joao),
      fatura_nubank_bruna: parseNum(form.fatura_nubank_bruna),
      fatura_nubank_joao: parseNum(form.fatura_nubank_joao),
    }

    await supabase
      .from('cash_positions')
      .upsert(payload, { onConflict: 'year,month' })

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setLoading(false)
  }

  const numColor = (v: number) =>
    v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-600' : 'text-slate-500'

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-xl font-bold text-slate-800">Posição de Caixa</h1>
        <span className="text-sm text-slate-400">{MONTHS[MONTH - 1]} {YEAR}</span>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nubank Bruna (saldo)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.nubank_bruna}
                onChange={(e) => setForm({ ...form, nubank_bruna: e.target.value })}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Nubank João (saldo)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.nubank_joao}
                onChange={(e) => setForm({ ...form, nubank_joao: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fatura Nubank Bruna</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.fatura_nubank_bruna}
                onChange={(e) => setForm({ ...form, fatura_nubank_bruna: e.target.value })}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Fatura Nubank João</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.fatura_nubank_joao}
                onChange={(e) => setForm({ ...form, fatura_nubank_joao: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 size={16} />
                Salvo!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Saldo summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Resumo</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Nubank Bruna</span>
            <span className="tabular-nums font-medium">{formatCurrency(parseNum(form.nubank_bruna))}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Nubank João</span>
            <span className="tabular-nums font-medium">{formatCurrency(parseNum(form.nubank_joao))}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Fatura Nubank Bruna</span>
            <span className="tabular-nums font-medium">− {formatCurrency(parseNum(form.fatura_nubank_bruna))}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Fatura Nubank João</span>
            <span className="tabular-nums font-medium">− {formatCurrency(parseNum(form.fatura_nubank_joao))}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
            <span>Saldo Real de Caixa</span>
            <span className={`tabular-nums ${numColor(saldoReal)}`}>{formatCurrency(saldoReal)}</span>
          </div>
          {saldoCalculado !== null && (
            <>
              <div className="flex justify-between text-slate-500 text-xs pt-1">
                <span>Saldo Calculado (lançamentos)</span>
                <span className={`tabular-nums ${numColor(saldoCalculado)}`}>{formatCurrency(saldoCalculado)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Diferença</span>
                <span className={`tabular-nums font-medium ${numColor(saldoCalculado - saldoReal)}`}>
                  {formatCurrency(saldoCalculado - saldoReal)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

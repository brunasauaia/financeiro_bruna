'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Category, Notes, TransactionType } from '@/lib/types'
import { PEOPLE, TRANSACTION_TYPES } from '@/lib/constants'
import { CheckCircle2, Plus, Trash2, ArrowRight } from 'lucide-react'

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const LABEL = 'block text-xs font-medium text-slate-500 mb-1'

export default function LancamentoPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [notes, setNotes] = useState<Notes | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [calcValues, setCalcValues] = useState<string[]>(['', ''])
  const lastCalcRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    date: todayString(),
    type: 'gasto' as TransactionType,
    category_id: '',
    person: 'casal',
    amount: '',
    description: '',
  })

  useEffect(() => {
    supabase.from('categories').select('*').order('display_order').then(({ data }) => {
      if (data) setCategories(data)
    })
    supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle().then(({ data, error }) => {
      if (error) console.error('Erro ao carregar notas:', JSON.stringify(error))
      if (data) setNotes(data)
    })
  }, [])

  useEffect(() => {
    if (form.type === 'reembolsavel') {
      const reembolsosCat = categories.find((c) => c.name === 'Reembolsos')
      setForm((f) => ({ ...f, category_id: reembolsosCat ? String(reembolsosCat.id) : '' }))
    } else {
      setForm((f) => ({ ...f, category_id: '' }))
    }
  }, [form.type, categories])

  const filteredCategories = categories.filter((c) =>
    form.type === 'entrada' ? c.type === 'entrada' : c.type === 'gasto'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_id || !form.amount) return

    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      date: form.date,
      type: form.type,
      category_id: Number(form.category_id),
      person: form.person,
      amount: parseFloat(form.amount.replace(',', '.')),
      description: form.description || null,
    })

    if (!error) {
      setSuccess(true)
      setForm({ date: todayString(), type: 'gasto', category_id: '', person: 'casal', amount: '', description: '' })
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  async function saveNote(field: keyof Notes, value: string) {
    if (notes?.id) {
      const { error } = await supabase.from('notes').update({ [field]: value }).eq('id', notes.id)
      if (error) console.error('Erro ao salvar nota:', JSON.stringify(error))
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from('notes').insert({ [field]: value } as any).select().single()
      if (error) console.error('Erro ao criar nota:', JSON.stringify(error))
      if (data) setNotes(data as Notes)
    }
  }

  const calcTotal = calcValues.reduce((sum, v) => {
    const n = parseFloat(v.replace(',', '.'))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  function addCalcRow() {
    setCalcValues((prev) => [...prev, ''])
    setTimeout(() => lastCalcRef.current?.focus(), 0)
  }

  function removeCalcRow(i: number) {
    setCalcValues((prev) => prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i))
  }

  function useCalcTotal() {
    if (calcTotal <= 0) return
    setForm((f) => ({ ...f, amount: calcTotal.toFixed(2) }))
    setCalcValues(['', ''])
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Lançamento</h1>

      <div className="flex gap-5 items-start mb-6">
      {/* Transaction form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 w-1/2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className={LABEL}>Tipo</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {TRANSACTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value as TransactionType })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.type === t.value
                        ? t.value === 'entrada'
                          ? 'bg-emerald-600 text-white'
                          : t.value === 'reembolsavel'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={`${INPUT} ${form.type === 'reembolsavel' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                disabled={form.type === 'reembolsavel'}
                required
              >
                <option value="">Selecione...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Pessoa</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {PEOPLE.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, person: p.value })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.person === p.value
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={INPUT}
                required
              />
            </div>
            <div>
              <label className={LABEL}>Descrição</label>
              <input
                type="text"
                placeholder="Opcional"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 size={16} />
                Lançamento registrado!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Mini calculator */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-1/2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Calculadora</h2>
        <div className="space-y-2 mb-3">
          {calcValues.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                ref={i === calcValues.length - 1 ? lastCalcRef : undefined}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={v}
                onChange={(e) => setCalcValues((prev) => prev.map((x, idx) => idx === i ? e.target.value : x))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCalcRow() } }}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              />
              <button
                type="button"
                onClick={() => removeCalcRow(i)}
                className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCalcRow}
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors mb-4"
        >
          <Plus size={12} /> Adicionar linha
        </button>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <p className="text-xs text-slate-400 mb-0.5">Total</p>
          <p className="text-xl font-bold text-slate-800 tabular-nums">
            {calcTotal > 0 ? `R$ ${calcTotal.toFixed(2).replace('.', ',')}` : '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={useCalcTotal}
          disabled={calcTotal <= 0}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Usar valor <ArrowRight size={12} />
        </button>
      </div>
      </div>

      {/* Notes section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">Notas</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['note_1', 'note_2', 'note_3', 'note_4'] as const).map((field, i) => (
            <div key={field}>
              <label className={LABEL}>Nota {i + 1}</label>
              <textarea
                rows={4}
                value={notes?.[field] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...(n ?? { id: '', note_1: null, note_2: null, note_3: null, note_4: null, updated_at: '' }), [field]: e.target.value }))}
                onBlur={(e) => saveNote(field, e.target.value)}
                placeholder="Escreva aqui..."
                className={`${INPUT} resize-none`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

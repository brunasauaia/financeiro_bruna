'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction } from '@/lib/types'
import { PERSON_LABELS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2, Clock, RotateCcw, X } from 'lucide-react'

interface ModalState {
  tx: Transaction
  valor: string
}

export default function ReembolsosPage() {
  const [pending, setPending] = useState<Transaction[]>([])
  const [received, setReceived] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)

  const fetchReembolsos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('type', 'reembolsavel')
      .order('date', { ascending: false })

    if (data) {
      setPending((data as Transaction[]).filter((t) => !t.reimbursed))
      setReceived((data as Transaction[]).filter((t) => t.reimbursed))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReembolsos()
  }, [fetchReembolsos])

  function openModal(tx: Transaction) {
    setModal({ tx, valor: String(tx.amount) })
  }

  async function handleConfirmar() {
    if (!modal) return
    const { tx } = modal
    const valorRecebido = parseFloat(modal.valor.replace(',', '.'))

    if (isNaN(valorRecebido) || valorRecebido <= 0) {
      alert('Informe um valor válido.')
      return
    }
    if (valorRecebido > tx.amount) {
      alert('O valor recebido não pode ser maior que o valor original.')
      return
    }

    setProcessingId(tx.id)
    setModal(null)

    if (valorRecebido === tx.amount) {
      // Reembolso total
      await supabase.from('transactions').update({ reimbursed: true }).eq('id', tx.id)
    } else {
      // Reembolso parcial: cria registro recebido + atualiza original com o restante
      const restante = Math.round((tx.amount - valorRecebido) * 100) / 100
      await Promise.all([
        supabase.from('transactions').update({ amount: restante }).eq('id', tx.id),
        supabase.from('transactions').insert({
          date: tx.date,
          type: tx.type,
          amount: valorRecebido,
          category_id: tx.category_id,
          person: tx.person,
          description: tx.description ? `${tx.description} (parcial)` : '(parcial)',
          reimbursed: true,
        }),
      ])
    }

    setProcessingId(null)
    fetchReembolsos()
  }

  const totalPending = pending.reduce((s, t) => s + t.amount, 0)
  const totalReceived = received.reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">Reembolsos</h1>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Carregando...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-amber-500" />
              <h2 className="font-semibold text-slate-700">Pendentes</h2>
              {pending.length > 0 && (
                <span className="ml-auto text-sm text-slate-500">
                  Total: <span className="font-semibold text-amber-600">{formatCurrency(totalPending)}</span>
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {pending.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                  Nenhum reembolso pendente.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Pessoa</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((tx, i) => (
                      <tr
                        key={tx.id}
                        className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3 text-slate-700">{tx.category?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{PERSON_LABELS[tx.person]}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {tx.description ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-700">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openModal(tx)}
                            disabled={processingId === tx.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            <RotateCcw size={12} />
                            Recebido
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Received */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <h2 className="font-semibold text-slate-700">Recebidos</h2>
              {received.length > 0 && (
                <span className="ml-auto text-sm text-slate-500">
                  Total: <span className="font-semibold text-emerald-600">{formatCurrency(totalReceived)}</span>
                </span>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {received.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
                  Nenhum reembolso recebido.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Pessoa</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
                      <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {received.map((tx, i) => (
                      <tr
                        key={tx.id}
                        className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3 text-slate-700">{tx.category?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{PERSON_LABELS[tx.person]}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {tx.description ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Valor recebido</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-1">
              {modal.tx.description || modal.tx.category?.name}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Valor original: <span className="font-medium text-amber-600">{formatCurrency(modal.tx.amount)}</span>
            </p>

            <label className="block text-xs font-medium text-slate-500 mb-1">
              Quanto você recebeu?
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={modal.tx.amount}
              value={modal.valor}
              onChange={(e) => setModal({ ...modal, valor: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-5"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

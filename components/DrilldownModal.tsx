'use client'

import { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PERSON_LABELS, MONTHS } from '@/lib/constants'
import { X } from 'lucide-react'

interface DrilldownModalProps {
  categoryName: string
  month: number
  year: number
  transactions: Transaction[]
  onClose: () => void
}

export default function DrilldownModal({
  categoryName,
  month,
  year,
  transactions,
  onClose,
}: DrilldownModalProps) {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-800">{categoryName}</h2>
            <p className="text-sm text-slate-500">
              {MONTHS[month - 1]} {year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-96">
          {transactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">
              Nenhum lançamento neste período.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Pessoa</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Descrição</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={tx.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {PERSON_LABELS[tx.person]}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {transactions.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
            <span className="text-sm font-semibold text-slate-800">
              Total: {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

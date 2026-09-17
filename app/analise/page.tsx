'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/lib/types'
import { MONTH_ABBR, MONTHS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const CATEGORY_GROUPS = [
  { label: 'Moradia',      categories: ['Contas Casa', 'Manutenção Casa', 'Assinaturas', 'Alfredo'] },
  { label: 'Alimentação',  categories: ['Supermercado', 'Ifood'] },
  { label: 'Transporte',   categories: ['Carro Bru', 'Carro João', 'Uber'] },
  { label: 'Saúde/Beleza', categories: ['Saúde', 'Esportes', 'Farmácia', 'Manicure'] },
  { label: 'Pessoal',      categories: ['Compras Bru', 'Compras João', 'Presentes', 'Viagem', 'Lazer', 'Educação'] },
  { label: 'Outros',       categories: ['Outros Gastos'] },
  { label: 'Reembolsos',   categories: ['Reembolso'] },
]

const PESSOAS = [
  { value: 'bruna', label: 'Bruna' },
  { value: 'joao',  label: 'João' },
  { value: 'casal', label: 'Casal' },
]

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0)
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) =>
        p.value > 0 ? (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }}>{p.dataKey}</span>
            <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ) : null
      )}
      {payload.length > 1 && total > 0 && (
        <div className="border-t border-slate-100 mt-1 pt-1 flex justify-between font-semibold text-slate-700">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  )
}

function YoYTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-2">Acumulado até {label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value > 0 && payload[1].value > 0 && (
        <div className="border-t border-slate-100 mt-1 pt-1 text-slate-500">
          {(() => {
            const diff = payload[0].value - payload[1].value
            const pct = ((diff / payload[1].value) * 100).toFixed(1)
            return (
              <span className={diff > 0 ? 'text-red-500' : 'text-emerald-600'}>
                {diff > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diff))} ({Math.abs(Number(pct))}%)
              </span>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function BridgeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const pos = payload.find((p: any) => p.dataKey === 'positive')?.value ?? 0
  const neg = payload.find((p: any) => p.dataKey === 'negative')?.value ?? 0
  const tot = payload.find((p: any) => p.dataKey === 'total')?.value ?? 0
  const isTotal = tot > 0
  const delta = pos > 0 ? pos : -neg
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {isTotal ? (
        <p className="tabular-nums text-blue-600 font-medium">{formatCurrency(tot)}</p>
      ) : (
        <p className={`tabular-nums font-medium ${delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {delta > 0 ? '+' : ''}{formatCurrency(delta)}
        </p>
      )}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-600 hover:text-slate-800">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" />
      {label}
    </label>
  )
}

async function fetchYearTxs(catIds: number[], y: number) {
  const allTx: any[] = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('transactions')
      .select('date, amount, category_id, reimbursed, person')
      .in('category_id', catIds)
      .gte('date', `${y}-01-01`)
      .lte('date', `${y}-12-31`)
      .neq('type', 'entrada')
      .range(from, from + pageSize - 1)
    if (!data || data.length === 0) break
    allTx.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return allTx
}

export default function AnalisePage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [groupLabel, setGroupLabel] = useState('Alimentação')
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [rawTxs, setRawTxs] = useState<any[]>([])
  const [prevYearTxs, setPrevYearTxs] = useState<any[]>([])
  const [allCatTxsCurrent, setAllCatTxsCurrent] = useState<any[]>([])
  const [allCatTxsPrev, setAllCatTxsPrev] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(['Supermercado', 'Alimentação Fora', 'Ifood/Rappi']))
  const [selectedPersons, setSelectedPersons] = useState<Set<string>>(new Set(['bruna', 'joao', 'casal']))
  const [compareMonth, setCompareMonth] = useState(CURRENT_MONTH)

  const selectedGroup = CATEGORY_GROUPS.find((g) => g.label === groupLabel)!

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('type', 'gasto')
      .then(({ data }) => { if (data) setAllCategories(data) })
  }, [])

  useEffect(() => {
    setSelectedCats(new Set(selectedGroup.categories))
  }, [groupLabel])

  const fetchData = useCallback(async () => {
    if (!allCategories.length || !selectedGroup) return
    setLoading(true)

    const catIds = allCategories
      .filter((c) => selectedGroup.categories.includes(c.name))
      .map((c) => c.id)

    const allExpenseCatIds = allCategories.map((c) => c.id)

    if (!catIds.length) {
      setRawTxs([])
      setPrevYearTxs([])
      setAllCatTxsCurrent([])
      setAllCatTxsPrev([])
      setLoading(false)
      return
    }

    const [current, prev, allCurrent, allPrev] = await Promise.all([
      fetchYearTxs(catIds, year),
      fetchYearTxs(catIds, year - 1),
      fetchYearTxs(allExpenseCatIds, year),
      fetchYearTxs(allExpenseCatIds, year - 1),
    ])
    setRawTxs(current)
    setPrevYearTxs(prev)
    setAllCatTxsCurrent(allCurrent)
    setAllCatTxsPrev(allPrev)
    setLoading(false)
  }, [allCategories, selectedGroup, year])

  useEffect(() => { fetchData() }, [fetchData])

  const catIdToName = useMemo(() => {
    const map: Record<number, string> = {}
    for (const c of allCategories) map[c.id] = c.name
    return map
  }, [allCategories])

  const selectedCatIds = useMemo(() => new Set(
    allCategories
      .filter((c) => selectedGroup.categories.includes(c.name) && selectedCats.has(c.name))
      .map((c) => c.id)
  ), [allCategories, selectedGroup, selectedCats])

  const chartData = useMemo(() => {
    const monthly: Record<number, Record<string, number>> = {}
    for (let m = 1; m <= 12; m++) {
      monthly[m] = {}
      for (const name of selectedGroup.categories) monthly[m][name] = 0
    }
    for (const tx of rawTxs) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      const name = catIdToName[tx.category_id]
      if (name && monthly[m]) monthly[m][name] = (monthly[m][name] ?? 0) + tx.amount
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_ABBR[i],
      ...monthly[i + 1],
    })) as Array<Record<string, string | number>>
  }, [rawTxs, selectedPersons, selectedGroup, catIdToName])

  const activeCats = selectedGroup.categories.filter(
    (name) => selectedCats.has(name) && chartData.some((d) => ((d[name] as number) ?? 0) > 0)
  )

  const total = chartData.reduce(
    (s, d) => s + activeCats.reduce((cs, name) => cs + ((d[name] as number) ?? 0), 0), 0
  )
  const monthTotals = chartData.map((d) =>
    activeCats.reduce((s, name) => s + ((d[name] as number) ?? 0), 0)
  )
  const nonZeroMonths = monthTotals.filter((v) => v > 0)
  const avg = nonZeroMonths.length ? total / nonZeroMonths.length : 0
  const max = Math.max(0, ...monthTotals)
  const maxIdx = monthTotals.indexOf(max)

  const yoyChartData = useMemo(() => {
    const currentByMonth = Array(13).fill(0)
    const prevByMonth = Array(13).fill(0)
    for (const tx of rawTxs) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      if (!selectedCatIds.has(tx.category_id)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m <= compareMonth) currentByMonth[m] += tx.amount
    }
    for (const tx of prevYearTxs) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      if (!selectedCatIds.has(tx.category_id)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m <= compareMonth) prevByMonth[m] += tx.amount
    }
    let cumCurrent = 0
    let cumPrev = 0
    return Array.from({ length: compareMonth }, (_, i) => {
      const m = i + 1
      cumCurrent += currentByMonth[m]
      cumPrev += prevByMonth[m]
      return {
        month: MONTH_ABBR[i],
        [String(year)]: Math.round(cumCurrent * 100) / 100,
        [String(year - 1)]: Math.round(cumPrev * 100) / 100,
      }
    })
  }, [rawTxs, prevYearTxs, compareMonth, selectedPersons, year, selectedCatIds])

  const yoyTotalCurrent = yoyChartData[yoyChartData.length - 1]?.[String(year)] as number ?? 0
  const yoyTotalPrev    = yoyChartData[yoyChartData.length - 1]?.[String(year - 1)] as number ?? 0
  const yoyDiff = yoyTotalCurrent - yoyTotalPrev
  const yoyPct  = yoyTotalPrev > 0 ? (yoyDiff / yoyTotalPrev) * 100 : null

  const bridgeData = useMemo(() => {
    const currentByCat: Record<string, number> = {}
    const prevByCat: Record<string, number> = {}
    for (const name of selectedGroup.categories) {
      if (!selectedCats.has(name)) continue
      currentByCat[name] = 0
      prevByCat[name] = 0
    }
    for (const tx of rawTxs) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      const name = catIdToName[tx.category_id]
      if (!name || !selectedCats.has(name)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m <= compareMonth) currentByCat[name] = (currentByCat[name] ?? 0) + tx.amount
    }
    for (const tx of prevYearTxs) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      const name = catIdToName[tx.category_id]
      if (!name || !selectedCats.has(name)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m <= compareMonth) prevByCat[name] = (prevByCat[name] ?? 0) + tx.amount
    }
    const items: { name: string; base: number; positive: number; negative: number; total: number }[] = []
    let running = yoyTotalPrev
    items.push({ name: String(year - 1), base: 0, positive: 0, negative: 0, total: Math.round(yoyTotalPrev * 100) / 100 })
    for (const catName of selectedGroup.categories) {
      if (!selectedCats.has(catName)) continue
      const curr = currentByCat[catName] ?? 0
      const prev = prevByCat[catName] ?? 0
      const diff = curr - prev
      if (Math.abs(diff) < 0.01) continue
      const base = diff >= 0 ? running : running + diff
      items.push({
        name: catName,
        base: Math.max(0, Math.round(base * 100) / 100),
        positive: diff > 0 ? Math.round(diff * 100) / 100 : 0,
        negative: diff < 0 ? Math.round(-diff * 100) / 100 : 0,
        total: 0,
      })
      running += diff
    }
    items.push({ name: String(year), base: 0, positive: 0, negative: 0, total: Math.round(yoyTotalCurrent * 100) / 100 })
    return items
  }, [rawTxs, prevYearTxs, compareMonth, selectedPersons, selectedGroup, selectedCats, catIdToName, yoyTotalPrev, yoyTotalCurrent, year])

  // All-category table data
  const catTableData = useMemo(() => {
    const result: Record<string, { prev: number; curr: number }> = {}
    for (const tx of allCatTxsCurrent) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m > compareMonth) continue
      const name = catIdToName[tx.category_id]
      if (!name) continue
      if (!result[name]) result[name] = { prev: 0, curr: 0 }
      result[name].curr += tx.amount
    }
    for (const tx of allCatTxsPrev) {
      if (tx.reimbursed) continue
      if (!selectedPersons.has(tx.person)) continue
      const m = new Date(tx.date + 'T00:00:00').getMonth() + 1
      if (m > compareMonth) continue
      const name = catIdToName[tx.category_id]
      if (!name) continue
      if (!result[name]) result[name] = { prev: 0, curr: 0 }
      result[name].prev += tx.amount
    }
    return result
  }, [allCatTxsCurrent, allCatTxsPrev, compareMonth, selectedPersons, catIdToName])

  const tableTotalPrev = Object.values(catTableData).reduce((s, v) => s + v.prev, 0)
  const tableTotalCurr = Object.values(catTableData).reduce((s, v) => s + v.curr, 0)
  const tableTotalDiff = tableTotalCurr - tableTotalPrev
  const tableTotalPct  = tableTotalPrev > 0 ? (tableTotalDiff / tableTotalPrev) * 100 : null

  function toggleCat(name: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function togglePerson(value: string) {
    setSelectedPersons((prev) => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  function diffColor(diff: number) {
    if (diff > 0) return 'text-red-500'
    if (diff < 0) return 'text-emerald-600'
    return 'text-slate-400'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-slate-800 mr-auto">Análise</h1>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
        >
          {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Comparar até</span>
          <select
            value={compareMonth}
            onChange={(e) => setCompareMonth(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-wrap">
          {CATEGORY_GROUPS.map((g) => (
            <button
              key={g.label}
              onClick={() => setGroupLabel(g.label)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                groupLabel === g.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 mb-5 flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categorias</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {selectedGroup.categories.map((name) => (
              <Checkbox key={name} label={name} checked={selectedCats.has(name)} onChange={() => toggleCat(name)} />
            ))}
          </div>
        </div>
        <div className="border-l border-slate-100 pl-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pessoas</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {PESSOAS.map((p) => (
              <Checkbox key={p.value} label={p.label} checked={selectedPersons.has(p.value)} onChange={() => togglePerson(p.value)} />
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Carregando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Total {year}</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums">{formatCurrency(total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Média mensal</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums">{formatCurrency(avg)}</p>
              <p className="text-xs text-slate-400 mt-0.5">meses com gasto</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-500 mb-1">Maior mês</p>
              <p className="text-xl font-bold text-slate-800 tabular-nums">{max > 0 ? formatCurrency(max) : '—'}</p>
              {max > 0 && <p className="text-xs text-slate-400 mt-0.5">{MONTHS[maxIdx]}</p>}
            </div>
          </div>

          {/* Monthly chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            {total === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                Nenhum lançamento para os filtros selecionados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>} />
                  {activeCats.map((name, i) => (
                    <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === activeCats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={56} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* YoY + Bridge side by side */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* YoY chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-700">Comparação Ano a Ano</h2>
                <p className="text-xs text-slate-400 mt-0.5">Acumulado de Jan a {MONTHS[compareMonth - 1]}</p>
              </div>
              {yoyTotalCurrent === 0 && yoyTotalPrev === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  Nenhum dado para comparar.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={yoyChartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip content={<YoYTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>} />
                      <Bar dataKey={String(year)} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey={String(year - 1)} fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>{year - 1}: <strong className="text-slate-700">{formatCurrency(yoyTotalPrev)}</strong></span>
                    <span>{year}: <strong className="text-slate-700">{formatCurrency(yoyTotalCurrent)}</strong></span>
                    {yoyPct !== null && (
                      <span className={yoyDiff > 0 ? 'text-red-500' : 'text-emerald-600'}>
                        {yoyDiff > 0 ? '▲' : '▼'} {Math.abs(yoyPct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bridge chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-700">Bridge {year - 1} → {year}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Decomposição da variação — Jan a {MONTHS[compareMonth - 1]}</p>
              </div>
              {bridgeData.length <= 2 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  Nenhuma variação entre categorias neste período.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={bridgeData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={44} />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip content={<BridgeTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <ReferenceLine y={yoyTotalPrev} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1} />
                      <ReferenceLine y={yoyTotalCurrent} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1} />
                      <Bar dataKey="base" stackId="bridge" fill="transparent" legendType="none" />
                      <Bar dataKey="positive" stackId="bridge" radius={[4, 4, 0, 0]} legendType="none" maxBarSize={48}>
                        {bridgeData.map((_, i) => <Cell key={i} fill="#ef4444" />)}
                      </Bar>
                      <Bar dataKey="negative" stackId="bridge" radius={[4, 4, 0, 0]} legendType="none" maxBarSize={48}>
                        {bridgeData.map((_, i) => <Cell key={i} fill="#10b981" />)}
                      </Bar>
                      <Bar dataKey="total" stackId="bridge" radius={[4, 4, 0, 0]} legendType="none" maxBarSize={48}>
                        {bridgeData.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-5 mt-3 pt-3 border-t border-slate-100 justify-center text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Total acumulado</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Aumento</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Redução</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* All-category comparison table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Detalhamento por Categoria</h2>
              <p className="text-xs text-slate-400 mt-0.5">Acumulado de Jan a {MONTHS[compareMonth - 1]} — {year - 1} vs {year}</p>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">{year - 1}</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">{year}</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Diferença</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_GROUPS.map((group) => {
                  const groupCats = allCategories.filter((c) => group.categories.includes(c.name))
                  if (!groupCats.length) return null
                  const groupHasData = groupCats.some((c) => {
                    const d = catTableData[c.name]
                    return (d?.prev ?? 0) > 0 || (d?.curr ?? 0) > 0
                  })
                  if (!groupHasData) return null
                  return (
                    <Fragment key={group.label}>
                      <tr className="bg-slate-100 border-t border-b border-slate-200">
                        <td className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider" colSpan={5}>
                          {group.label}
                        </td>
                      </tr>
                      {groupCats.map((cat) => {
                        const d = catTableData[cat.name] ?? { prev: 0, curr: 0 }
                        if (d.prev === 0 && d.curr === 0) return null
                        const diff = d.curr - d.prev
                        const pct = d.prev > 0 ? (diff / d.prev) * 100 : null
                        return (
                          <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-700">{cat.name}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                              {d.prev > 0 ? formatCurrency(d.prev) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                              {d.curr > 0 ? formatCurrency(d.curr) : '—'}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${diffColor(diff)}`}>
                              {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatCurrency(diff)}` : '—'}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums text-xs ${pct !== null ? diffColor(pct) : 'text-slate-400'}`}>
                              {pct !== null ? `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
                <tr className="border-t-2 border-slate-200 bg-blue-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">Total Gastos</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                    {tableTotalPrev > 0 ? formatCurrency(tableTotalPrev) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-700">
                    {tableTotalCurr > 0 ? formatCurrency(tableTotalCurr) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${diffColor(tableTotalDiff)}`}>
                    {tableTotalDiff !== 0 ? `${tableTotalDiff > 0 ? '+' : ''}${formatCurrency(tableTotalDiff)}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums text-xs ${tableTotalPct !== null ? diffColor(tableTotalPct) : 'text-slate-400'}`}>
                    {tableTotalPct !== null ? `${tableTotalDiff > 0 ? '▲' : '▼'} ${Math.abs(tableTotalPct).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

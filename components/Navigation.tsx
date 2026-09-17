'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, PlusCircle, Wallet, History, RotateCcw, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'

const links = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/lancamento', label: 'Lançamento', icon: PlusCircle },
  { href: '/posicao-caixa', label: 'Posição de Caixa', icon: Wallet },
  { href: '/historico', label: 'Histórico', icon: History },
  { href: '/reembolsos', label: 'Reembolsos', icon: RotateCcw },
  { href: '/analise', label: 'Análise', icon: BarChart2 },
]

export default function Navigation() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('nav-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('nav-collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <nav className={`${collapsed ? 'w-14' : 'w-56'} bg-slate-900 flex flex-col flex-shrink-0 min-h-screen transition-all duration-200`}>
      <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-0' : 'px-5 justify-between'}`}>
        {!collapsed && (
          <span className="text-white font-bold text-base tracking-tight">Financeiro</span>
        )}
        <button
          onClick={toggle}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <ul className="flex-1 px-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

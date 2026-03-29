import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  Wrench,
  BarChart3,
  Users,
  Music,
  Mail,
  DollarSign,
  Settings,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Wrench },
  { to: '/campaigns', label: 'Campaigns', icon: BarChart3 },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/curators', label: 'Curators', icon: Music },
  { to: '/outreach', label: 'Outreach', icon: Mail },
  { to: '/financials', label: 'Financials', icon: DollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="relative z-50 flex w-60 flex-col border-r border-gray-200 bg-white/95">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <img
            src="/bifrost-logo.jpg"
            alt="BIFROST"
            className="h-11 w-11 rounded-xl object-cover shadow-lg ring-1 ring-gray-200"
          />
          <div>
            <div className="font-display text-sm font-bold tracking-widest text-gray-900">BIFROST</div>
            <div className="text-[11px] font-medium tracking-wide text-gray-400">Campaign Manager</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-1">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-[18px] w-[18px] text-gray-400 transition-colors group-hover:text-red-500" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

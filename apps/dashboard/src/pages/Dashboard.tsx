import { Users, BarChart3, DollarSign, TrendingUp, Wrench, Mail, Music, ArrowRight, LayoutDashboard } from 'lucide-react'
import { usePipelineEntries } from '@/hooks/usePipeline'
import { useCampaigns } from '@/hooks/useCampaigns'
import { PageHeader } from '@/components/layout/PageHeader'

export function Dashboard() {
  const { data: entries } = usePipelineEntries()
  const { data: campaigns } = useCampaigns()

  const pipelineCount = entries?.length ?? 0
  const withEmail = entries?.filter((e) => e.artist?.email).length ?? 0
  const activeCampaigns = campaigns?.filter((c) => c.status === 'active').length ?? 0
  const totalRevenue = campaigns?.reduce((s, c) => s + (c.total_budget ?? 0), 0) ?? 0
  const totalSpent = campaigns?.reduce((s, c) => s + (c.total_cost ?? 0), 0) ?? 0
  const margin = totalRevenue - totalSpent

  const stageCounts = entries?.reduce(
    (acc, e) => {
      acc[e.stage] = (acc[e.stage] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  ) ?? {}

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Overview of your playlist placement business"
      />

      <div className="flex-1 overflow-y-auto p-8">

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="kpi-card flex items-center justify-between">
          <div>
            <p className="font-mono text-2xl font-bold text-gray-900">{pipelineCount}</p>
            <p className="mt-0.5 text-sm font-medium text-gray-500">In Pipeline</p>
            <p className="text-xs text-gray-400">{withEmail} have email</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <Users className="h-6 w-6 text-teal-500" />
          </div>
        </div>

        <div className="kpi-card flex items-center justify-between">
          <div>
            <p className="font-mono text-2xl font-bold text-gray-900">{activeCampaigns}</p>
            <p className="mt-0.5 text-sm font-medium text-gray-500">Active Campaigns</p>
            <p className="text-xs text-gray-400">{campaigns?.length ?? 0} total</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <BarChart3 className="h-6 w-6 text-violet-600" />
          </div>
        </div>

        <div className="kpi-card flex items-center justify-between">
          <div>
            <p className="font-mono text-2xl font-bold text-emerald-600">${totalRevenue.toLocaleString()}</p>
            <p className="mt-0.5 text-sm font-medium text-gray-500">Revenue</p>
            <p className="text-xs text-gray-400">from client payments</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        <div className="kpi-card flex items-center justify-between">
          <div>
            <p className={`font-mono text-2xl font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${margin.toLocaleString()}
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-500">Profit</p>
            <p className="text-xs text-gray-400">${totalSpent.toLocaleString()} paid to curators</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Breakdown */}
        <div className="card p-6">
          <h2 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-gray-400">Pipeline Breakdown</h2>
          <div className="space-y-4">
            {[
              { stage: 'discovered', color: 'bg-gray-400', label: 'Discovered' },
              { stage: 'contacted', color: 'bg-blue-500', label: 'Contacted' },
              { stage: 'responded', color: 'bg-emerald-500', label: 'Responded' },
              { stage: 'follow_up', color: 'bg-teal-500', label: 'Follow Up' },
            ].map(({ stage, color, label }) => {
              const count = stageCounts[stage] ?? 0
              const pct = pipelineCount > 0 ? (count / pipelineCount) * 100 : 0
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-gray-500">{label}</div>
                  <div className="flex-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-10 text-right font-mono text-sm font-bold text-gray-700">{count}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
            <span className="text-gray-400">{withEmail} with email addresses</span>
            <span className="font-mono font-bold text-gray-700">{pipelineCount} total</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-gray-400">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { href: '/pipeline', icon: Wrench, title: 'Open Pipeline', desc: 'Manage your kanban board' },
              { href: '/outreach', icon: Mail, title: 'Send Bulk Email', desc: 'Reach out to pipeline leads' },
              { href: '/curators', icon: Music, title: 'Manage Curators', desc: 'Your playlist network' },
              { href: '/financials', icon: DollarSign, title: 'View Financials', desc: 'Revenue, expenses, and P&L' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white/50 p-4 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white">
                  <item.icon className="h-5 w-5 text-teal-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-teal-500" />
              </a>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

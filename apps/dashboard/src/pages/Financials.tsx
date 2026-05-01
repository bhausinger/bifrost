import { useState } from 'react'
import { DollarSign, Plus } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui'
import { AddTransactionModal } from './financials/AddTransactionModal'

export function Financials(): JSX.Element {
  const { data: transactions, isLoading, error } = useTransactions()
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')

  const filtered =
    typeFilter === 'all' ? transactions : transactions?.filter((t) => t.type === typeFilter)

  const totalIncome =
    transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses =
    transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const profit = totalIncome - totalExpenses
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={DollarSign}
        title="Financials"
        description="Revenue, expenses, and profitability"
        actions={
          <Button
            variant="primary"
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-600">Failed to load transactions</p>
            <p className="mt-1 text-xs text-red-400">{error.message}</p>
          </div>
        )}

        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="text-sm font-medium text-gray-500">Amount Paid</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              ${totalIncome.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">received from artists</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium text-gray-500">Amount Spent</div>
            <div className="mt-1 font-mono text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">paid to curators</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium text-gray-500">Profit</div>
            <div
              className={`mt-1 font-mono text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              ${profit.toLocaleString()}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium text-gray-500">Margin</div>
            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">
              {margin.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                typeFilter === t
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          {isLoading && <div className="p-6 text-sm text-gray-400">Loading...</div>}
          {filtered?.length === 0 && !isLoading && (
            <div className="p-8 text-center text-sm text-gray-400">
              No transactions yet. Add your first one to start tracking finances.
            </div>
          )}
          {filtered && filtered.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.description || '-'}</td>
                    <td className="px-4 py-3">
                      {tx.category && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300/50">
                          {tx.category.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{tx.payment_method || '-'}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AddTransactionModal
          open={showAddTransaction}
          onClose={() => setShowAddTransaction(false)}
        />
      </div>
    </div>
  )
}

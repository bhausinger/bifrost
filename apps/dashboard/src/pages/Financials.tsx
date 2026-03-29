import { useState } from 'react'
import { DollarSign, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Transaction } from '@/types'

export function Financials() {
  const queryClient = useQueryClient()
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })

  const [formType, setFormType] = useState<'income' | 'expense'>('income')
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('client_payment')
  const [formPaymentMethod, setFormPaymentMethod] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  const addTransaction = useMutation({
    mutationFn: async (tx: Partial<Transaction> & { type: string; amount: number; transaction_date: string }) => {
      const { data, error } = await supabase.from('transactions').insert(tx).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setShowAddTransaction(false)
      setFormAmount('')
      setFormDescription('')
    },
  })

  const filtered = typeFilter === 'all' ? transactions : transactions?.filter((t) => t.type === typeFilter)

  const totalIncome = transactions?.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalExpenses = transactions?.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const profit = totalIncome - totalExpenses
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={DollarSign}
        title="Financials"
        description="Revenue, expenses, and profitability"
        actions={
          <button
            onClick={() => setShowAddTransaction(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Amount Paid</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">${totalIncome.toLocaleString()}</div>
          <div className="mt-0.5 text-xs text-gray-400">received from artists</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Amount Spent</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
          <div className="mt-0.5 text-xs text-gray-400">paid to curators</div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Profit</div>
          <div className={`mt-1 font-mono text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${profit.toLocaleString()}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500">Margin</div>
          <div className="mt-1 font-mono text-2xl font-bold text-gray-900">{margin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(['all', 'income', 'expense'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              typeFilter === t
                ? 'bg-gray-900 text-gray-900'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</th>
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
                  <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                    tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddTransaction(false)} />
          <div className="modal-panel fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-lg">
            <h3 className="text-lg font-display font-semibold text-gray-900">Add Transaction</h3>
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                {(['income', 'expense'] as const).map((t) => (
                  <button key={t} onClick={() => { setFormType(t); setFormCategory(t === 'income' ? 'client_payment' : 'curator_payment') }}
                    className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                      formType === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-500'
                    }`}>
                    {t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount *</label>
                  <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                    className="input-field w-full"
                    placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                    className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field w-full"
                  placeholder="What's this for?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                    className="select-field w-full">
                    <option value="client_payment">Client Payment</option>
                    <option value="curator_payment">Curator Payment</option>
                    <option value="software">Software</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Payment Method</label>
                  <select value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="select-field w-full">
                    <option value="">Select...</option>
                    <option value="stripe">Stripe</option>
                    <option value="cashapp">CashApp</option>
                    <option value="paypal">PayPal</option>
                    <option value="venmo">Venmo</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddTransaction(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
                <button
                  onClick={() => addTransaction.mutate({ type: formType, amount: parseFloat(formAmount), description: formDescription || null, category: formCategory || null, payment_method: formPaymentMethod || null, transaction_date: formDate } as any)}
                  disabled={!formAmount}
                  className="btn-primary disabled:opacity-50">
                  Add {formType === 'income' ? 'Income' : 'Expense'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}

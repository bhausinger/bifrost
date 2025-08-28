import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionApproval } from '@/components/finance/TransactionApproval';
import { ProfitLossReport } from '@/components/finance/ProfitLossReport';
import { BudgetAnalysis } from '@/components/finance/BudgetAnalysis';
import { FinancialForecast } from '@/components/finance/FinancialForecast';
import { useTransactions, useFinancialStats } from '@/hooks/api/useFinance';

type TabType = 'transactions' | 'approval' | 'reports' | 'budget' | 'forecast';

export function Finance() {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: stats, isLoading: statsLoading } = useFinancialStats();

  const tabs = [
    { id: 'transactions' as TabType, label: 'Transactions', icon: '💳' },
    { id: 'approval' as TabType, label: 'Approvals', icon: '✅' },
    { id: 'reports' as TabType, label: 'P&L Reports', icon: '📊' },
    { id: 'budget' as TabType, label: 'Budget Analysis', icon: '💰' },
    { id: 'forecast' as TabType, label: 'Forecasting', icon: '📈' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-600">
            Track expenses, revenue, and campaign profitability
          </p>
        </div>
        <Button
          onClick={() => setShowTransactionForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          + Add Transaction
        </Button>
      </div>

      {/* Quick Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">📉</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats.totalExpenses?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${
                  (stats.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${stats.netProfit?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">⏱️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className={`text-2xl font-bold ${
                  (stats.monthlyNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${stats.monthlyNet?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'transactions' && (
          <TransactionList 
            transactions={transactions || []} 
            loading={transactionsLoading}
            onAddTransaction={() => setShowTransactionForm(true)}
          />
        )}

        {activeTab === 'approval' && (
          <TransactionApproval />
        )}

        {activeTab === 'reports' && (
          <ProfitLossReport />
        )}

        {activeTab === 'budget' && (
          <BudgetAnalysis />
        )}

        {activeTab === 'forecast' && (
          <FinancialForecast />
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          onClose={() => setShowTransactionForm(false)}
          onSuccess={() => {
            setShowTransactionForm(false);
          }}
        />
      )}
    </div>
  );
}
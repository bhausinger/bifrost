import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TransactionForm } from './TransactionForm';

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  amount: number;
  currency: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: string;
  transactionDate: string;
  campaignId?: string;
  artistId?: string;
  invoiceNumber?: string;
  tags: string[];
  campaign?: {
    name: string;
  };
  artist?: {
    name: string;
    displayName?: string;
  };
  createdAt: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  onAddTransaction: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  loading,
  onAddTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.campaign?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.artist?.displayName || transaction.artist?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !typeFilter || transaction.type === typeFilter;
    const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
    const matchesStatus = !statusFilter || transaction.status === statusFilter;

    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  // Calculate summary statistics
  const summary = filteredTransactions.reduce(
    (acc, transaction) => {
      if (transaction.status === 'COMPLETED') {
        if (transaction.type === 'INCOME') {
          acc.totalIncome += transaction.amount;
        } else if (transaction.type === 'EXPENSE') {
          acc.totalExpenses += transaction.amount;
        }
      }
      return acc;
    },
    { totalIncome: 0, totalExpenses: 0 }
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      REFUNDED: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      INCOME: 'bg-green-100 text-green-800',
      EXPENSE: 'bg-red-100 text-red-800',
      TRANSFER: 'bg-blue-100 text-blue-800',
    };

    const icons = {
      INCOME: '💰',
      EXPENSE: '💸',
      TRANSFER: '🔄',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        <span className="mr-1">{icons[type as keyof typeof icons]}</span>
        {type}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      CAMPAIGN_REVENUE: 'Campaign Revenue',
      ARTIST_PAYMENT: 'Artist Payment',
      SUBSCRIPTION_FEE: 'Subscription Fee',
      SERVICE_FEE: 'Service Fee',
      COMMISSION: 'Commission',
      OTHER_INCOME: 'Other Income',
      MARKETING: 'Marketing',
      ADVERTISING: 'Advertising',
      SOFTWARE_TOOLS: 'Software & Tools',
      PLATFORM_FEES: 'Platform Fees',
      ARTIST_PAYMENT_OUT: 'Artist Payment',
      OPERATIONAL_COSTS: 'Operational Costs',
      EQUIPMENT: 'Equipment',
      TRAVEL: 'Travel',
      OTHER_EXPENSE: 'Other Expense',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">💰</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-red-600 text-xl">💸</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
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
              <p className={`text-xl font-bold ${
                (summary.totalIncome - summary.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.totalIncome - summary.totalExpenses)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="CAMPAIGN_REVENUE">Campaign Revenue</option>
              <option value="MARKETING">Marketing</option>
              <option value="ADVERTISING">Advertising</option>
              <option value="ARTIST_PAYMENT_OUT">Artist Payment</option>
              <option value="OPERATIONAL_COSTS">Operational Costs</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button onClick={onAddTransaction} className="w-full">
              + Add Transaction
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Association
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {transactions.length === 0 ? (
                      <div>
                        <div className="text-4xl mb-2">💳</div>
                        <p className="text-lg font-medium mb-2">No transactions yet</p>
                        <p className="text-sm">Start by adding your first transaction</p>
                        <Button onClick={onAddTransaction} className="mt-4">
                          Add Transaction
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-lg font-medium mb-2">No transactions found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.transactionDate)}
                        </p>
                        {transaction.invoiceNumber && (
                          <p className="text-xs text-gray-400">
                            Invoice: {transaction.invoiceNumber}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getTypeBadge(transaction.type)}
                        <p className="text-xs text-gray-500">
                          {getCategoryLabel(transaction.category)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'INCOME' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        via {transaction.paymentMethod.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {transaction.campaign && (
                          <p className="text-gray-900">{transaction.campaign.name}</p>
                        )}
                        {transaction.artist && (
                          <p className="text-gray-500">
                            {transaction.artist.displayName || transaction.artist.name}
                          </p>
                        )}
                        {!transaction.campaign && !transaction.artist && (
                          <p className="text-gray-400">No association</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTransaction(transaction)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <TransactionForm
          initialData={{
            type: editingTransaction.type,
            category: editingTransaction.category as any,
            amount: editingTransaction.amount,
            currency: editingTransaction.currency,
            description: editingTransaction.description,
            paymentMethod: editingTransaction.paymentMethod as any,
            transactionDate: editingTransaction.transactionDate.split('T')[0],
            campaignId: editingTransaction.campaignId,
            artistId: editingTransaction.artistId,
            invoiceNumber: editingTransaction.invoiceNumber || '',
            tags: editingTransaction.tags,
          }}
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => {
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
};
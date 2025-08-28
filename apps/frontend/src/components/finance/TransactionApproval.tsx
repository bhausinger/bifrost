import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTransactions, useUpdateTransaction } from '@/hooks/api/useFinance';

interface ApprovalTransaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  paymentMethod: string;
  transactionDate: string;
  invoiceNumber?: string;
  campaign?: { name: string };
  artist?: { name: string; displayName?: string };
  createdAt: string;
}

export const TransactionApproval: React.FC = () => {
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  
  // Get pending transactions
  const { data: transactions, isLoading } = useTransactions({ status: 'PENDING' });
  const updateTransaction = useUpdateTransaction();

  const pendingTransactions = (transactions || []).filter(t => t.status === 'PENDING') as ApprovalTransaction[];

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(pendingTransactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleBulkApproval = async (status: 'COMPLETED' | 'CANCELLED') => {
    try {
      for (const transactionId of selectedTransactions) {
        await updateTransaction.mutateAsync({
          id: transactionId,
          data: { status },
        });
      }
      setSelectedTransactions([]);
    } catch (error) {
      console.error('Bulk approval failed:', error);
    }
  };

  const handleSingleApproval = async (transactionId: string, status: 'COMPLETED' | 'CANCELLED') => {
    try {
      await updateTransaction.mutateAsync({
        id: transactionId,
        data: { status },
      });
    } catch (error) {
      console.error('Single approval failed:', error);
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Bulk Actions */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transaction Approval</h2>
            <p className="text-sm text-gray-600">
              {pendingTransactions.length} transaction(s) pending approval
            </p>
          </div>
          
          {selectedTransactions.length > 0 && (
            <div className="flex space-x-2">
              <Button
                onClick={() => handleBulkApproval('COMPLETED')}
                disabled={updateTransaction.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve Selected ({selectedTransactions.length})
              </Button>
              <Button
                onClick={() => handleBulkApproval('CANCELLED')}
                disabled={updateTransaction.isPending}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Reject Selected
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Pending Transactions */}
      {pendingTransactions.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-sm">
              No transactions are pending approval at this time.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === pendingTransactions.length && pendingTransactions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Details
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
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
                        <p className="text-xs text-gray-400">
                          Created: {formatDate(transaction.createdAt)}
                        </p>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleSingleApproval(transaction.id, 'COMPLETED')}
                          disabled={updateTransaction.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleSingleApproval(transaction.id, 'CANCELLED')}
                          disabled={updateTransaction.isPending}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Approval Guidelines */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">✅ Approve When:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Transaction details are accurate and complete</li>
              <li>• Amount and category match supporting documentation</li>
              <li>• Transaction is associated with valid campaign/artist</li>
              <li>• Payment method and date are verified</li>
            </ul>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">❌ Reject When:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Transaction details are incomplete or incorrect</li>
              <li>• Amount exceeds budget or authorization limits</li>
              <li>• Supporting documentation is missing or invalid</li>
              <li>• Transaction appears fraudulent or suspicious</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
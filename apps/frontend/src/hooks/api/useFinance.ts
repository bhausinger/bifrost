import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

// Types
export interface Transaction {
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

export interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyNet: number;
  totalTransactions: number;
  categoryBreakdown: Array<{
    category: string;
    type: string;
    _sum: { amount: number };
    _count: { id: number };
  }>;
}

export interface PLReport {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  incomeByCategory: Array<{
    category: string;
    _sum: { amount: number };
  }>;
  expensesByCategory: Array<{
    category: string;
    _sum: { amount: number };
  }>;
  campaignPL: Array<{
    campaignId: string;
    _sum: { amount: number };
  }>;
  monthlyData: Array<{
    month: string;
    type: string;
    total_amount: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface BudgetAnalysis {
  campaigns: Array<{
    campaignId: string;
    campaignName: string;
    budget: number;
    totalSpent: number;
    totalEarned: number;
    remaining: number;
    utilizationRate: number;
    roi: number;
    status: string;
    isOverBudget: boolean;
  }>;
  totalBudget: number;
  totalSpent: number;
  totalEarned: number;
  overBudgetCampaigns: number;
}

export interface FinancialForecast {
  forecast: Array<{
    month: string;
    projectedIncome: number;
    projectedExpenses: number;
    projectedNet: number;
    confidence: number;
  }>;
  trends: {
    avgIncome: number;
    avgExpenses: number;
    growthRate: number;
    volatility: number;
    seasonality: Record<number, number>;
  };
  recommendations: string[];
}

// Hooks

/**
 * Get transactions with filters
 */
export const useTransactions = (filters?: {
  type?: string;
  category?: string;
  status?: string;
  campaignId?: string;
  artistId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await apiClient.get(`/finance/transactions?${params.toString()}`);
      return response.data.data as Transaction[];
    },
  });
};

/**
 * Create a new transaction
 */
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: string;
      category: string;
      amount: number;
      currency?: string;
      description: string;
      paymentMethod: string;
      transactionDate: string;
      campaignId?: string;
      artistId?: string;
      invoiceNumber?: string;
      referenceId?: string;
      tags?: string[];
      receiptFile?: File;
    }) => {
      const formData = new FormData();
      
      // Append all fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'tags' && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (key === 'receiptFile' && value instanceof File) {
            formData.append('receiptFile', value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await apiClient.post('/finance/transactions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });
};

/**
 * Update a transaction
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const response = await apiClient.put(`/finance/transactions/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });
};

/**
 * Delete a transaction
 */
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/finance/transactions/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });
};

/**
 * Get financial statistics
 */
export const useFinancialStats = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['financial-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start);
        params.append('endDate', dateRange.end);
      }

      const response = await apiClient.get(`/finance/stats?${params.toString()}`);
      return response.data.data as FinancialStats;
    },
  });
};

/**
 * Generate P&L report
 */
export const usePLReport = (dateRange: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['pl-report', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);

      const response = await apiClient.get(`/finance/reports/pnl?${params.toString()}`);
      return response.data.data as PLReport;
    },
    enabled: !!dateRange.start && !!dateRange.end,
  });
};

/**
 * Get budget analysis
 */
export const useBudgetAnalysis = () => {
  return useQuery({
    queryKey: ['budget-analysis'],
    queryFn: async () => {
      const response = await apiClient.get('/finance/reports/budget');
      return response.data.data as BudgetAnalysis;
    },
  });
};

/**
 * Generate financial forecast
 */
export const useFinancialForecast = (months: number = 6) => {
  return useQuery({
    queryKey: ['financial-forecast', months],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('months', months.toString());

      const response = await apiClient.get(`/finance/reports/forecast?${params.toString()}`);
      return response.data.data as FinancialForecast;
    },
  });
};

/**
 * Get campaigns for transaction association
 */
export const useCampaigns = () => {
  return useQuery({
    queryKey: ['finance-campaigns'],
    queryFn: async () => {
      const response = await apiClient.get('/finance/campaigns');
      return response.data.data as Array<{ id: string; name: string }>;
    },
  });
};

/**
 * Get artists for transaction association
 */
export const useArtists = () => {
  return useQuery({
    queryKey: ['finance-artists'],
    queryFn: async () => {
      const response = await apiClient.get('/finance/artists');
      return response.data.data as Array<{ id: string; name: string; displayName?: string }>;
    },
  });
};
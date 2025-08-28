import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export class FinancialService {
  
  /**
   * Create a new transaction
   */
  async createTransaction(userId: string, transactionData: any, receiptFile?: any) {
    try {
      // Handle receipt file upload if provided
      let receiptUrl = null;
      if (receiptFile) {
        // In a real implementation, you'd upload to cloud storage
        receiptUrl = `/uploads/receipts/${receiptFile.filename}`;
      }

      const transaction = await prisma.transaction.create({
        data: {
          ...transactionData,
          ownerId: userId,
          metadata: receiptUrl ? { receiptUrl } : null,
        },
        include: {
          campaign: {
            select: { name: true }
          },
          artist: {
            select: { name: true, displayName: true }
          }
        }
      });

      logger.info(`Transaction created: ${transaction.id} for user: ${userId}`);
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions for a user with filters
   */
  async getTransactions(userId: string, filters: {
    type?: string;
    category?: string;
    status?: string;
    campaignId?: string;
    artistId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const where: any = {
        ownerId: userId,
      };

      if (filters.type) where.type = filters.type;
      if (filters.category) where.category = filters.category;
      if (filters.status) where.status = filters.status;
      if (filters.campaignId) where.campaignId = filters.campaignId;
      if (filters.artistId) where.artistId = filters.artistId;

      if (filters.startDate && filters.endDate) {
        where.transactionDate = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          campaign: {
            select: { name: true }
          },
          artist: {
            select: { name: true, displayName: true }
          }
        },
        orderBy: {
          transactionDate: 'desc'
        },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      });

      return transactions;
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Update a transaction
   */
  async updateTransaction(userId: string, transactionId: string, updateData: any) {
    try {
      const transaction = await prisma.transaction.update({
        where: {
          id: transactionId,
          ownerId: userId, // Ensure user owns the transaction
        },
        data: updateData,
        include: {
          campaign: {
            select: { name: true }
          },
          artist: {
            select: { name: true, displayName: true }
          }
        }
      });

      logger.info(`Transaction updated: ${transactionId} by user: ${userId}`);
      return transaction;
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(userId: string, transactionId: string) {
    try {
      await prisma.transaction.delete({
        where: {
          id: transactionId,
          ownerId: userId, // Ensure user owns the transaction
        },
      });

      logger.info(`Transaction deleted: ${transactionId} by user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get financial statistics for a user
   */
  async getFinancialStats(userId: string, dateRange?: { start: string; end: string }) {
    try {
      const whereClause: any = {
        ownerId: userId,
        status: 'COMPLETED', // Only count completed transactions
      };

      if (dateRange) {
        whereClause.transactionDate = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        };
      }

      // Get total income and expenses
      const [incomeResult, expenseResult] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...whereClause, type: 'INCOME' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.transaction.aggregate({
          where: { ...whereClause, type: 'EXPENSE' },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const totalRevenue = incomeResult._sum.amount || 0;
      const totalExpenses = expenseResult._sum.amount || 0;
      const netProfit = totalRevenue - totalExpenses;

      // Get monthly stats (current month)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const [monthlyIncomeResult, monthlyExpenseResult] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            ownerId: userId,
            status: 'COMPLETED',
            type: 'INCOME',
            transactionDate: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            ownerId: userId,
            status: 'COMPLETED',
            type: 'EXPENSE',
            transactionDate: {
              gte: currentMonth,
              lt: nextMonth,
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const monthlyRevenue = monthlyIncomeResult._sum.amount || 0;
      const monthlyExpenses = monthlyExpenseResult._sum.amount || 0;
      const monthlyNet = monthlyRevenue - monthlyExpenses;

      // Get category breakdown
      const categoryBreakdown = await prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true },
      });

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        monthlyRevenue,
        monthlyExpenses,
        monthlyNet,
        totalTransactions: incomeResult._count.id + expenseResult._count.id,
        categoryBreakdown,
      };
    } catch (error) {
      logger.error('Error getting financial stats:', error);
      throw error;
    }
  }

  /**
   * Generate Profit & Loss report
   */
  async generatePLReport(userId: string, dateRange: { start: string; end: string }) {
    try {
      const whereClause = {
        ownerId: userId,
        status: 'COMPLETED',
        transactionDate: {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end),
        },
      };

      // Get income breakdown by category
      const incomeByCategory = await prisma.transaction.groupBy({
        by: ['category'],
        where: { ...whereClause, type: 'INCOME' },
        _sum: { amount: true },
      });

      // Get expense breakdown by category
      const expensesByCategory = await prisma.transaction.groupBy({
        by: ['category'],
        where: { ...whereClause, type: 'EXPENSE' },
        _sum: { amount: true },
      });

      // Get campaign-specific P&L
      const campaignPL = await prisma.transaction.groupBy({
        by: ['campaignId'],
        where: { ...whereClause, campaignId: { not: null } },
        _sum: { amount: true },
      });

      // Get monthly breakdown
      const monthlyData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          type,
          SUM(amount) as total_amount
        FROM transactions 
        WHERE owner_id = ${userId} 
        AND status = 'COMPLETED'
        AND transaction_date >= ${new Date(dateRange.start)}
        AND transaction_date <= ${new Date(dateRange.end)}
        GROUP BY month, type
        ORDER BY month ASC
      `;

      const totalIncome = incomeByCategory.reduce((sum, cat) => sum + (cat._sum.amount || 0), 0);
      const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + (cat._sum.amount || 0), 0);
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        summary: {
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin,
        },
        incomeByCategory,
        expensesByCategory,
        campaignPL,
        monthlyData,
        dateRange,
      };
    } catch (error) {
      logger.error('Error generating P&L report:', error);
      throw error;
    }
  }

  /**
   * Get budget analysis for campaigns
   */
  async getBudgetAnalysis(userId: string) {
    try {
      // Get campaigns with budgets
      const campaigns = await prisma.campaign.findMany({
        where: {
          ownerId: userId,
          budget: { not: null },
        },
        include: {
          transactions: {
            where: { status: 'COMPLETED' },
          },
        },
      });

      const budgetAnalysis = campaigns.map(campaign => {
        const totalSpent = campaign.transactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalEarned = campaign.transactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + t.amount, 0);

        const budget = campaign.budget || 0;
        const remaining = budget - totalSpent;
        const utilizationRate = budget > 0 ? (totalSpent / budget) * 100 : 0;
        const roi = totalSpent > 0 ? ((totalEarned - totalSpent) / totalSpent) * 100 : 0;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          budget,
          totalSpent,
          totalEarned,
          remaining,
          utilizationRate,
          roi,
          status: campaign.status,
          isOverBudget: totalSpent > budget,
        };
      });

      return {
        campaigns: budgetAnalysis,
        totalBudget: budgetAnalysis.reduce((sum, c) => sum + c.budget, 0),
        totalSpent: budgetAnalysis.reduce((sum, c) => sum + c.totalSpent, 0),
        totalEarned: budgetAnalysis.reduce((sum, c) => sum + c.totalEarned, 0),
        overBudgetCampaigns: budgetAnalysis.filter(c => c.isOverBudget).length,
      };
    } catch (error) {
      logger.error('Error getting budget analysis:', error);
      throw error;
    }
  }

  /**
   * Generate financial forecast
   */
  async generateForecast(userId: string, months: number = 6) {
    try {
      // Get historical data for trend analysis
      const historicalData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          type,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM transactions 
        WHERE owner_id = ${userId} 
        AND status = 'COMPLETED'
        AND transaction_date >= NOW() - INTERVAL '12 months'
        GROUP BY month, type
        ORDER BY month ASC
      `;

      // Calculate trends and seasonal patterns
      const monthlyTrends = this.calculateMonthlyTrends(historicalData as any[]);
      
      // Generate forecast for next N months
      const forecast = [];
      const today = new Date();
      
      for (let i = 1; i <= months; i++) {
        const forecastMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = forecastMonth.toISOString().slice(0, 7); // YYYY-MM format
        
        // Apply trend and seasonal adjustments
        const baseIncome = monthlyTrends.avgIncome;
        const baseExpenses = monthlyTrends.avgExpenses;
        
        const seasonalFactor = this.getSeasonalFactor(forecastMonth.getMonth());
        const trendFactor = 1 + (monthlyTrends.growthRate / 100) * i;
        
        const projectedIncome = baseIncome * seasonalFactor * trendFactor;
        const projectedExpenses = baseExpenses * seasonalFactor * trendFactor;
        
        forecast.push({
          month: monthKey,
          projectedIncome,
          projectedExpenses,
          projectedNet: projectedIncome - projectedExpenses,
          confidence: Math.max(0.5, 1 - (i * 0.1)), // Decreasing confidence over time
        });
      }

      return {
        forecast,
        trends: monthlyTrends,
        recommendations: this.generateRecommendations(monthlyTrends, forecast),
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      throw error;
    }
  }

  private calculateMonthlyTrends(historicalData: any[]) {
    const monthlyTotals: Record<string, { income: number; expenses: number }> = {};
    
    historicalData.forEach(record => {
      const month = new Date(record.month).toISOString().slice(0, 7);
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { income: 0, expenses: 0 };
      }
      
      if (record.type === 'INCOME') {
        monthlyTotals[month].income = Number(record.total_amount);
      } else if (record.type === 'EXPENSE') {
        monthlyTotals[month].expenses = Number(record.total_amount);
      }
    });

    const months = Object.keys(monthlyTotals).sort();
    const incomeValues = months.map(m => monthlyTotals[m].income);
    const expenseValues = months.map(m => monthlyTotals[m].expenses);

    return {
      avgIncome: incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length || 0,
      avgExpenses: expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length || 0,
      growthRate: this.calculateGrowthRate(incomeValues),
      volatility: this.calculateVolatility(incomeValues),
      seasonality: this.detectSeasonality(monthlyTotals),
    };
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private detectSeasonality(monthlyTotals: Record<string, { income: number; expenses: number }>): Record<number, number> {
    const monthlyAverages: Record<number, number[]> = {};
    
    Object.entries(monthlyTotals).forEach(([monthStr, data]) => {
      const month = new Date(monthStr + '-01').getMonth();
      if (!monthlyAverages[month]) monthlyAverages[month] = [];
      monthlyAverages[month].push(data.income);
    });

    const seasonalFactors: Record<number, number> = {};
    Object.entries(monthlyAverages).forEach(([month, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      seasonalFactors[Number(month)] = avg;
    });

    return seasonalFactors;
  }

  private getSeasonalFactor(month: number): number {
    // Default seasonal factors (can be customized based on business)
    const factors = {
      0: 0.95,  // January
      1: 0.90,  // February
      2: 1.05,  // March
      3: 1.10,  // April
      4: 1.15,  // May
      5: 1.20,  // June
      6: 1.10,  // July
      7: 1.05,  // August
      8: 1.15,  // September
      9: 1.20,  // October
      10: 1.25, // November
      11: 1.30, // December
    };
    
    return factors[month as keyof typeof factors] || 1.0;
  }

  private generateRecommendations(trends: any, forecast: any[]): string[] {
    const recommendations: string[] = [];
    
    if (trends.growthRate < 0) {
      recommendations.push('Revenue is declining. Consider reviewing marketing strategies and customer acquisition.');
    }
    
    if (trends.volatility > trends.avgIncome * 0.3) {
      recommendations.push('High income volatility detected. Consider diversifying revenue streams.');
    }
    
    const avgProjectedNet = forecast.reduce((sum, f) => sum + f.projectedNet, 0) / forecast.length;
    if (avgProjectedNet < 0) {
      recommendations.push('Projected losses ahead. Review expenses and consider cost optimization.');
    }
    
    const lastMonthForecast = forecast[forecast.length - 1];
    if (lastMonthForecast.confidence < 0.7) {
      recommendations.push('Long-term projections have lower confidence. Monitor trends closely.');
    }
    
    return recommendations;
  }
}
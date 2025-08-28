import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePLReport } from '@/hooks/api/useFinance';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const ProfitLossReport: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    end: new Date().toISOString().split('T')[0], // Today
  });

  const { data: report, isLoading, refetch } = usePLReport(dateRange);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const generateReport = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
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

  // Colors for charts
  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>
          <Button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700">
            Generate Report
          </Button>
        </div>
      </Card>

      {report ? (
        <>
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-green-600 text-xl">💰</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.summary.totalIncome)}
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
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.summary.totalExpenses)}
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
                    report.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(report.summary.netProfit)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-purple-600 text-xl">📈</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                  <p className={`text-2xl font-bold ${
                    report.summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(report.summary.profitMargin)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          {report.monthlyData && report.monthlyData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'INCOME' ? 'Income' : 'Expenses']}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="INCOME" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Income"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="EXPENSE" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Income & Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Breakdown</h3>
              {report.incomeByCategory && report.incomeByCategory.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.incomeByCategory.map((item, index) => ({
                            name: getCategoryLabel(item.category),
                            value: item._sum.amount || 0,
                            color: COLORS[index % COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {report.incomeByCategory.map((_, index) => (
                            <Cell key={`income-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {report.incomeByCategory.map((item, index) => (
                      <div key={item.category} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700">
                            {getCategoryLabel(item.category)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(item._sum.amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">💰</div>
                  <p>No income data for this period</p>
                </div>
              )}
            </Card>

            {/* Expense Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              {report.expensesByCategory && report.expensesByCategory.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.expensesByCategory.map((item, index) => ({
                            name: getCategoryLabel(item.category),
                            value: item._sum.amount || 0,
                            color: COLORS[index % COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {report.expensesByCategory.map((_, index) => (
                            <Cell key={`expense-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {report.expensesByCategory.map((item, index) => (
                      <div key={item.category} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700">
                            {getCategoryLabel(item.category)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-red-600">
                          {formatCurrency(item._sum.amount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">💸</div>
                  <p>No expense data for this period</p>
                </div>
              )}
            </Card>
          </div>

          {/* Campaign P&L */}
          {report.campaignPL && report.campaignPL.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.campaignPL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="campaignId" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="_sum.amount" fill="#10B981" name="Total Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Report Footer */}
          <Card className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <p>
                Report Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
              </p>
              <p>
                Generated on: {new Date().toLocaleDateString()}
              </p>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-sm mb-4">
              Select a date range and generate a report to see your profit & loss analysis.
            </p>
            <Button onClick={generateReport}>
              Generate Report
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
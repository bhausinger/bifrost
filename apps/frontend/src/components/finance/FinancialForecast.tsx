import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useFinancialForecast } from '@/hooks/api/useFinance';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const FinancialForecast: React.FC = () => {
  const [forecastMonths, setForecastMonths] = useState(6);
  const { data: forecast, isLoading, refetch } = useFinancialForecast(forecastMonths);

  const generateForecast = () => {
    refetch();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatMonth = (monthStr: string) => {
    return new Date(monthStr + '-01').toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
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
      {/* Forecast Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forecast Period (Months)
            </label>
            <select
              value={forecastMonths}
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
              <option value={18}>18 Months</option>
              <option value={24}>24 Months</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={generateForecast} className="bg-blue-600 hover:bg-blue-700">
              Generate Forecast
            </Button>
          </div>
        </div>
      </Card>

      {forecast ? (
        <>
          {/* Trend Summary */}
          {forecast.trends && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-green-600 text-xl">📈</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Monthly Income</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(forecast.trends.avgIncome)}
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
                    <p className="text-sm font-medium text-gray-600">Avg Monthly Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(forecast.trends.avgExpenses)}
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
                    <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                    <p className={`text-xl font-bold ${
                      forecast.trends.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {forecast.trends.growthRate >= 0 ? '+' : ''}{formatPercentage(forecast.trends.growthRate)}
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
                    <p className="text-sm font-medium text-gray-600">Volatility</p>
                    <p className="text-xl font-bold text-purple-600">
                      {formatCurrency(forecast.trends.volatility)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Forecast Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Forecast ({forecastMonths} Months)
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={formatMonth}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'projectedIncome' ? 'Projected Income' : 
                      name === 'projectedExpenses' ? 'Projected Expenses' : 'Net Profit'
                    ]}
                    labelFormatter={(value) => formatMonth(value)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="projectedIncome" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Projected Income"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projectedExpenses" 
                    stackId="2"
                    stroke="#EF4444" 
                    fill="#EF4444"
                    fillOpacity={0.6}
                    name="Projected Expenses"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projectedNet" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    name="Net Profit"
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Confidence and Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast Confidence */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Confidence</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast.forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} />
                    <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                    <Tooltip 
                      formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                      labelFormatter={(value) => formatMonth(value)}
                    />
                    <Bar 
                      dataKey="confidence" 
                      fill="#8B5CF6" 
                      name="Confidence Level"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  Confidence levels decrease over time. Near-term projections are more reliable 
                  than long-term forecasts.
                </p>
              </div>
            </Card>

            {/* Monthly Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {forecast.forecast.map((month, index) => (
                  <div key={month.month} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{formatMonth(month.month)}</p>
                      <p className="text-sm text-gray-600">
                        Confidence: {formatPercentage(month.confidence * 100)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        month.projectedNet >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(month.projectedNet)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(month.projectedIncome)} - {formatCurrency(month.projectedExpenses)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recommendations */}
          {forecast.recommendations && forecast.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
              <div className="space-y-3">
                {forecast.recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="text-blue-600 text-xl">💡</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">{recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Key Metrics Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecast Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Projected Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    forecast.forecast.reduce((sum, month) => sum + month.projectedIncome, 0)
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Projected Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    forecast.forecast.reduce((sum, month) => sum + month.projectedExpenses, 0)
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Net Projected Profit</p>
                <p className={`text-2xl font-bold ${
                  forecast.forecast.reduce((sum, month) => sum + month.projectedNet, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(
                    forecast.forecast.reduce((sum, month) => sum + month.projectedNet, 0)
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Disclaimer */}
          <Card className="p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Forecast Disclaimer</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Financial forecasts are estimates based on historical data and trends. 
                  Actual results may vary significantly due to market conditions, business changes, 
                  and unforeseen circumstances. Use these projections as guidance only.
                </p>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">🔮</div>
            <h3 className="text-lg font-medium mb-2">No Forecast Available</h3>
            <p className="text-sm mb-4">
              Generate a financial forecast based on your historical transaction data.
            </p>
            <Button onClick={generateForecast}>
              Generate Forecast
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
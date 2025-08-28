import React from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBudgetAnalysis } from '@/hooks/api/useFinance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const BudgetAnalysis: React.FC = () => {
  const { data: analysis, isLoading } = useBudgetAnalysis();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (utilizationRate: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'text-red-600';
    if (utilizationRate > 90) return 'text-orange-600';
    if (utilizationRate > 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (utilizationRate: number, isOverBudget: boolean) => {
    if (isOverBudget) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Over Budget
        </span>
      );
    }
    if (utilizationRate > 90) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Near Limit
        </span>
      );
    }
    if (utilizationRate > 75) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Caution
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        On Track
      </span>
    );
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!analysis || analysis.campaigns.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-lg font-medium mb-2">No Budget Data Available</h3>
          <p className="text-sm">
            Create campaigns with budgets to see budget analysis and utilization tracking.
          </p>
        </div>
      </Card>
    );
  }

  // Prepare data for charts
  const budgetUtilizationData = analysis.campaigns.map(campaign => ({
    name: campaign.campaignName.length > 15 
      ? campaign.campaignName.substring(0, 15) + '...' 
      : campaign.campaignName,
    budget: campaign.budget,
    spent: campaign.totalSpent,
    remaining: campaign.remaining,
    utilizationRate: campaign.utilizationRate,
    roi: campaign.roi,
  }));

  const budgetStatusData = [
    {
      name: 'On Track',
      value: analysis.campaigns.filter(c => !c.isOverBudget && c.utilizationRate <= 75).length,
      color: '#10B981',
    },
    {
      name: 'Caution',
      value: analysis.campaigns.filter(c => !c.isOverBudget && c.utilizationRate > 75 && c.utilizationRate <= 90).length,
      color: '#F59E0B',
    },
    {
      name: 'Near Limit',
      value: analysis.campaigns.filter(c => !c.isOverBudget && c.utilizationRate > 90).length,
      color: '#F97316',
    },
    {
      name: 'Over Budget',
      value: analysis.campaigns.filter(c => c.isOverBudget).length,
      color: '#EF4444',
    },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">💰</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(analysis.totalBudget)}
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
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(analysis.totalSpent)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">💵</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analysis.totalEarned)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-orange-600 text-xl">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Over Budget</p>
              <p className="text-2xl font-bold text-orange-600">
                {analysis.overBudgetCampaigns}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {budgetStatusData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} campaigns`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Spending</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetUtilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'budget' ? 'Budget' : name === 'spent' ? 'Spent' : 'Remaining'
                  ]}
                />
                <Legend />
                <Bar dataKey="budget" fill="#94A3B8" name="Budget" />
                <Bar dataKey="spent" fill="#EF4444" name="Spent" />
                <Bar dataKey="remaining" fill="#10B981" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Campaign Details Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Budget Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.campaigns.map((campaign) => (
                <tr key={campaign.campaignId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {campaign.campaignName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {campaign.status}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(campaign.budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    {formatCurrency(campaign.totalSpent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      campaign.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(campaign.remaining)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            campaign.isOverBudget
                              ? 'bg-red-500'
                              : campaign.utilizationRate > 90
                              ? 'bg-orange-500'
                              : campaign.utilizationRate > 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(campaign.utilizationRate, 100)}%`,
                          }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${
                        getStatusColor(campaign.utilizationRate, campaign.isOverBudget)
                      }`}>
                        {formatPercentage(campaign.utilizationRate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      campaign.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(campaign.roi)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(campaign.utilizationRate, campaign.isOverBudget)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Budget Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Recommendations</h3>
        <div className="space-y-3">
          {analysis.overBudgetCampaigns > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Over Budget Alert</h4>
                  <p className="text-sm text-red-700">
                    {analysis.overBudgetCampaigns} campaign(s) are over budget. 
                    Consider reducing expenses or increasing budget allocation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis.campaigns.filter(c => c.utilizationRate > 90 && !c.isOverBudget).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Budget Warning</h4>
                  <p className="text-sm text-yellow-700">
                    {analysis.campaigns.filter(c => c.utilizationRate > 90 && !c.isOverBudget).length} campaign(s) 
                    are near budget limits. Monitor spending closely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis.campaigns.filter(c => c.roi > 100).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">High ROI Campaigns</h4>
                  <p className="text-sm text-green-700">
                    {analysis.campaigns.filter(c => c.roi > 100).length} campaign(s) 
                    show positive ROI. Consider increasing budget for these successful campaigns.
                  </p>
                </div>
              </div>
            </div>
          )}

          {analysis.campaigns.every(c => !c.isOverBudget && c.utilizationRate <= 75) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-600 text-xl">👍</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Budget Management</h4>
                  <p className="text-sm text-blue-700">
                    All campaigns are within budget limits. Great job managing your finances!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCampaignAnalytics, useCampaignPerformance, useCampaignROI } from '@/hooks/api/useAnalytics';
import { PerformanceChart } from '@/components/analytics/PerformanceChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MetricSummaryProps {
  title: string;
  current: number;
  previous?: number;
  format?: (value: number) => string;
  icon?: string;
  color?: string;
}

const MetricSummary: React.FC<MetricSummaryProps> = ({
  title,
  current,
  previous,
  format = (v) => v.toLocaleString(),
  icon = '📊',
  color = 'blue',
}) => {
  const change = previous && previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = change >= 0 ? '↗' : '↘';
  
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <Card className={`p-6 border-l-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{icon}</span>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{format(current)}</p>
          {previous !== undefined && previous !== current && (
            <p className={`text-sm ${changeColor} flex items-center mt-1`}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(change).toFixed(1)}% vs previous period
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

interface ROIBreakdownProps {
  roiData: {
    campaignId: string;
    totalCost: number;
    totalStreams: number;
    estimatedRevenue: number;
    roi: number;
    costPerStream: number;
    conversionRate: number;
    breakdownByCategory: Array<{
      category: string;
      cost: number;
      percentage: number;
    }>;
  };
}

const ROIBreakdown: React.FC<ROIBreakdownProps> = ({ roiData }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI Analysis</h3>
      
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Total Investment</p>
          <p className="text-xl font-bold text-gray-900">${roiData.totalCost.toLocaleString()}</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Est. Revenue</p>
          <p className="text-xl font-bold text-green-600">${roiData.estimatedRevenue.toLocaleString()}</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">ROI</p>
          <p className={`text-xl font-bold ${roiData.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {roiData.roi.toFixed(1)}%
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Cost per Stream</p>
          <p className="text-xl font-bold text-purple-600">${roiData.costPerStream.toFixed(3)}</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Cost Breakdown</h4>
        <div className="space-y-2">
          {roiData.breakdownByCategory.map((category) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {category.category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-600">
                      ${category.cost.toLocaleString()} ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export const CampaignAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useCampaignAnalytics(id || '');
  const { data: performance, isLoading: performanceLoading } = useCampaignPerformance(id || '', period);
  const { data: roiData, isLoading: roiLoading } = useCampaignROI(id || '');

  if (analyticsError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800">Error loading campaign analytics</h3>
          <p className="mt-2 text-sm text-red-700">
            Unable to load analytics data for this campaign. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (analyticsLoading && !analytics) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data</h3>
          <p className="text-gray-500">
            Analytics data is not available for this campaign yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
          <p className="text-gray-600">Detailed performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
          <Button variant="outline">
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricSummary
          title="Total Streams"
          current={analytics.totalStreams}
          icon="▶️"
          color="blue"
        />
        <MetricSummary
          title="Stream Growth"
          current={analytics.totalStreamGrowth}
          format={(v) => `${v.toFixed(1)}%`}
          icon="📈"
          color="green"
        />
        <MetricSummary
          title="Total Followers"
          current={analytics.totalFollowers}
          icon="👥"
          color="purple"
        />
        <MetricSummary
          title="Engagement Rate"
          current={analytics.engagementRate}
          format={(v) => `${v.toFixed(1)}%`}
          icon="❤️"
          color="orange"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PerformanceChart
          data={performance?.data || []}
          title="Streams Over Time"
          metric="streams"
          isLoading={performanceLoading}
          height={250}
        />
        <PerformanceChart
          data={performance?.data || []}
          title="Followers Over Time"
          metric="followers"
          isLoading={performanceLoading}
          height={250}
        />
        <PerformanceChart
          data={performance?.data || []}
          title="Engagement Over Time"
          metric="engagement"
          isLoading={performanceLoading}
          height={250}
        />
      </div>

      {/* ROI Analysis */}
      {roiData && !roiLoading && (
        <ROIBreakdown roiData={roiData} />
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Average Streams per Artist</span>
              <span className="text-sm font-bold text-blue-900">
                {analytics.avgStreamsPerArtist.toLocaleString()}
              </span>
            </div>
            {analytics.topPerformingArtist && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Top Performing Artist</span>
                <span className="text-sm font-bold text-green-900">
                  {analytics.topPerformingArtist}
                </span>
              </div>
            )}
            {analytics.costPerStream && (
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-900">Cost per Stream</span>
                <span className="text-sm font-bold text-purple-900">
                  ${analytics.costPerStream.toFixed(3)}
                </span>
              </div>
            )}
            {analytics.roi && (
              <div className={`flex justify-between items-center p-3 rounded-lg ${
                analytics.roi >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <span className={`text-sm font-medium ${
                  analytics.roi >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  Return on Investment
                </span>
                <span className={`text-sm font-bold ${
                  analytics.roi >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {analytics.roi.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {analytics.roi && analytics.roi > 0 ? '📈' : '📊'}
              </div>
              <p className="text-sm text-gray-600 mb-1">Campaign Performance</p>
              <p className="text-lg font-semibold text-gray-900">
                {analytics.roi && analytics.roi > 0 ? 'Profitable' : 'In Progress'}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(analytics.lastUpdated).toLocaleString()}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <Button className="w-full" variant="outline">
                Refresh Analytics
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
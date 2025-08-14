import React, { useState } from 'react';
import { useAnalyticsDashboard } from '@/hooks/api/useAnalytics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  isLoading = false 
}) => {
  const changeColor = change && change > 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = change && change > 0 ? '↗' : '↘';

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {change !== undefined && (
            <p className={`text-sm ${changeColor} flex items-center mt-1`}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(change).toFixed(1)}% vs last period
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

interface TopItemsListProps {
  title: string;
  items: Array<{
    id: string;
    name: string;
    value: number;
    subtitle?: string;
  }>;
  isLoading?: boolean;
}

const TopItemsList: React.FC<TopItemsListProps> = ({ title, items, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {items.slice(0, 5).map((item, index) => (
          <div key={item.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                #{index + 1} {item.name}
              </p>
              {item.subtitle && (
                <p className="text-sm text-gray-500">{item.subtitle}</p>
              )}
            </div>
            <p className="font-semibold text-gray-700">
              {item.value.toLocaleString()}
            </p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-center py-4">No data available</p>
        )}
      </div>
    </Card>
  );
};

const RecentActivity: React.FC<{ 
  metrics: any[];
  isLoading?: boolean;
}> = ({ metrics, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse border-l-4 border-gray-200 pl-4">
              <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {metrics.slice(0, 5).map((metric) => (
          <div key={metric.id} className="border-l-4 border-blue-500 pl-4">
            <p className="font-medium text-gray-900">
              New metric recorded for {metric.platform}
            </p>
            <p className="text-sm text-gray-500">
              {metric.streamCount.toLocaleString()} streams • {new Date(metric.recordedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {metrics.length === 0 && (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </Card>
  );
};

export function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { data: dashboard, isLoading, error, refetch } = useAnalyticsDashboard();

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading analytics
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Unable to load analytics data. Please try again.</p>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatStreamGrowth = (growth: number) => {
    if (growth === 0) return 'No change';
    return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Track your campaign performance and artist metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button 
            onClick={() => refetch()}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Campaigns"
          value={dashboard?.totalCampaigns || 0}
          icon={<span className="text-blue-600 text-xl">📊</span>}
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Campaigns"
          value={dashboard?.activeCampaigns || 0}
          icon={<span className="text-green-600 text-xl">🚀</span>}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Artists"
          value={dashboard?.totalArtists || 0}
          icon={<span className="text-purple-600 text-xl">🎵</span>}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Streams"
          value={dashboard?.totalStreams || 0}
          change={dashboard?.streamGrowth}
          icon={<span className="text-orange-600 text-xl">▶️</span>}
          isLoading={isLoading}
        />
      </div>

      {/* Top Performance Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopItemsList
          title="Top Performing Campaigns"
          items={dashboard?.topCampaigns.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            value: campaign.totalStreams,
            subtitle: campaign.roi ? `ROI: ${campaign.roi.toFixed(1)}%` : undefined,
          })) || []}
          isLoading={isLoading}
        />
        <TopItemsList
          title="Top Performing Artists"
          items={dashboard?.topArtists.map(artist => ({
            id: artist.id,
            name: artist.name,
            value: artist.totalStreams,
            subtitle: `${artist.followerCount.toLocaleString()} followers`,
          })) || []}
          isLoading={isLoading}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivity 
        metrics={dashboard?.recentMetrics || []}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {/* Navigate to create campaign */}}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create New Campaign
          </Button>
          <Button
            onClick={() => {/* Navigate to add artist */}}
            variant="outline"
          >
            Add New Artist
          </Button>
          <Button
            onClick={() => {/* Navigate to metrics entry */}}
            variant="outline"
          >
            Record Stream Metrics
          </Button>
          <Button
            onClick={() => {/* Export dashboard data */}}
            variant="outline"
          >
            Export Data
          </Button>
        </div>
      </Card>

      {/* Performance Summary */}
      {dashboard && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {dashboard.totalStreams.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Streams Generated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {dashboard.activeCampaigns}
              </p>
              <p className="text-sm text-gray-600">Active Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatStreamGrowth(dashboard.streamGrowth)}
              </p>
              <p className="text-sm text-gray-600">Stream Growth</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
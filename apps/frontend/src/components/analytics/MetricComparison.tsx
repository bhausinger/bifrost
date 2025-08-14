import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ComparisonMetrics {
  streams: number;
  followers: number;
  engagement: number;
  roi?: number;
  costPerStream?: number;
}

interface ComparisonItem {
  id: string;
  name: string;
  metrics: ComparisonMetrics;
}

interface MetricComparisonProps {
  campaigns?: ComparisonItem[];
  artists?: ComparisonItem[];
  title: string;
  isLoading?: boolean;
}

const MetricBar: React.FC<{
  label: string;
  value: number;
  maxValue: number;
  color: string;
  format?: (value: number) => string;
}> = ({ label, value, maxValue, color, format = (v) => v.toLocaleString() }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{format(value)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

const ComparisonCard: React.FC<{
  item: ComparisonItem;
  maxMetrics: ComparisonMetrics;
  rank: number;
}> = ({ item, maxMetrics, rank }) => {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 2: return 'bg-gray-100 text-gray-800 border-gray-200';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <Card className="p-6 relative">
      <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-xs font-medium border ${getRankColor(rank)}`}>
        {getRankIcon(rank)}
      </div>
      
      <div className="pr-12 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate" title={item.name}>
          {item.name}
        </h3>
      </div>

      <div className="space-y-3">
        <MetricBar
          label="Streams"
          value={item.metrics.streams}
          maxValue={maxMetrics.streams}
          color="#3B82F6"
        />
        
        <MetricBar
          label="Followers"
          value={item.metrics.followers}
          maxValue={maxMetrics.followers}
          color="#10B981"
        />
        
        <MetricBar
          label="Engagement"
          value={item.metrics.engagement}
          maxValue={maxMetrics.engagement}
          color="#F59E0B"
          format={(v) => `${v.toFixed(1)}%`}
        />
        
        {item.metrics.roi !== undefined && maxMetrics.roi && (
          <MetricBar
            label="ROI"
            value={item.metrics.roi}
            maxValue={maxMetrics.roi}
            color="#8B5CF6"
            format={(v) => `${v.toFixed(1)}%`}
          />
        )}
        
        {item.metrics.costPerStream !== undefined && maxMetrics.costPerStream && (
          <MetricBar
            label="Cost per Stream"
            value={maxMetrics.costPerStream - item.metrics.costPerStream} // Invert for better display
            maxValue={maxMetrics.costPerStream}
            color="#EF4444"
            format={() => `$${item.metrics.costPerStream?.toFixed(3) || '0'}`}
          />
        )}
      </div>

      {/* Quick stats summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total Streams</p>
            <p className="font-semibold">{item.metrics.streams.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Followers</p>
            <p className="font-semibold">{item.metrics.followers.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const MetricComparison: React.FC<MetricComparisonProps> = ({
  campaigns = [],
  artists = [],
  title,
  isLoading = false,
}) => {
  const [viewType, setViewType] = useState<'campaigns' | 'artists'>('campaigns');
  const [sortBy, setSortBy] = useState<'streams' | 'followers' | 'engagement' | 'roi'>('streams');

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j}>
                      <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const items = viewType === 'campaigns' ? campaigns : artists;
  
  // Sort items based on selected metric
  const sortedItems = [...items].sort((a, b) => {
    const aValue = a.metrics[sortBy] || 0;
    const bValue = b.metrics[sortBy] || 0;
    return bValue - aValue; // Sort descending
  });

  // Calculate max values for normalization
  const maxMetrics: ComparisonMetrics = {
    streams: Math.max(...items.map(item => item.metrics.streams), 1),
    followers: Math.max(...items.map(item => item.metrics.followers), 1),
    engagement: Math.max(...items.map(item => item.metrics.engagement), 1),
    roi: Math.max(...items.map(item => item.metrics.roi || 0), 1),
    costPerStream: Math.max(...items.map(item => item.metrics.costPerStream || 0), 1),
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {/* View Type Toggle */}
          {campaigns.length > 0 && artists.length > 0 && (
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewType('campaigns')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewType === 'campaigns'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Campaigns
              </button>
              <button
                onClick={() => setViewType('artists')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewType === 'artists'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Artists
              </button>
            </div>
          )}
          
          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="streams">Sort by Streams</option>
            <option value="followers">Sort by Followers</option>
            <option value="engagement">Sort by Engagement</option>
            <option value="roi">Sort by ROI</option>
          </select>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data to compare</h3>
          <p className="text-gray-500">
            {viewType === 'campaigns' 
              ? 'Create some campaigns to see performance comparisons'
              : 'Add some artists to see performance comparisons'
            }
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{sortedItems.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Streams</p>
              <p className="text-xl font-bold text-blue-600">
                {sortedItems.reduce((sum, item) => sum + item.metrics.streams, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Followers</p>
              <p className="text-xl font-bold text-green-600">
                {sortedItems.reduce((sum, item) => sum + item.metrics.followers, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Avg Engagement</p>
              <p className="text-xl font-bold text-orange-600">
                {(sortedItems.reduce((sum, item) => sum + item.metrics.engagement, 0) / sortedItems.length).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedItems.slice(0, 9).map((item, index) => (
              <ComparisonCard
                key={item.id}
                item={item}
                maxMetrics={maxMetrics}
                rank={index + 1}
              />
            ))}
          </div>

          {sortedItems.length > 9 && (
            <div className="mt-6 text-center">
              <Button variant="outline">
                View All {sortedItems.length} {viewType}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
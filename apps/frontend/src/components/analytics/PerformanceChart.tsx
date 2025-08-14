import React from 'react';
import { Card } from '@/components/ui/Card';

interface ChartDataPoint {
  date: string;
  streams: number;
  followers: number;
  engagement: number;
}

interface PerformanceChartProps {
  data: ChartDataPoint[];
  title: string;
  metric: 'streams' | 'followers' | 'engagement';
  isLoading?: boolean;
  height?: number;
}

const SimpleLineChart: React.FC<{
  data: ChartDataPoint[];
  metric: 'streams' | 'followers' | 'engagement';
  height: number;
}> = ({ data, metric, height }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  const values = data.map(d => d[metric]);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // Generate SVG path for the line
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - point[metric]) / range) * 80 + 10; // 10% padding top/bottom
    return `${x},${y}`;
  }).join(' ');

  // Generate gradient area under the line
  const areaPoints = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - point[metric]) / range) * 80 + 10;
    return `${x},${y}`;
  });
  const areaPath = `M0,90 L${areaPoints.join(' L')} L100,90 Z`;

  const formatValue = (value: number) => {
    if (metric === 'engagement') return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const getColor = () => {
    switch (metric) {
      case 'streams': return '#3B82F6'; // blue
      case 'followers': return '#10B981'; // green
      case 'engagement': return '#F59E0B'; // orange
      default: return '#6B7280'; // gray
    }
  };

  return (
    <div className="relative">
      <svg 
        width="100%" 
        height={height} 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        
        {/* Area under the line */}
        <path
          d={areaPath}
          fill={`${getColor()}20`}
          stroke="none"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={getColor()}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = ((maxValue - point[metric]) / range) * 80 + 10;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="0.8"
              fill={getColor()}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      
      {/* Tooltip overlay */}
      <div className="relative z-10 h-full">
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          return (
            <div
              key={index}
              className="absolute group"
              style={{ 
                left: `${x}%`, 
                top: '0px', 
                transform: 'translateX(-50%)',
                height: '100%'
              }}
            >
              <div className="w-2 h-full opacity-0 group-hover:opacity-100 cursor-pointer">
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(point.date).toLocaleDateString()}<br/>
                  {formatValue(point[metric])}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  metric,
  isLoading = false,
  height = 200,
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  const latestValue = data.length > 0 ? data[data.length - 1][metric] : 0;
  const previousValue = data.length > 1 ? data[data.length - 2][metric] : latestValue;
  const change = previousValue !== 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;
  
  const formatValue = (value: number) => {
    if (metric === 'engagement') return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const getMetricIcon = () => {
    switch (metric) {
      case 'streams': return '▶️';
      case 'followers': return '👥';
      case 'engagement': return '❤️';
      default: return '📊';
    }
  };

  const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
  const changeIcon = change >= 0 ? '↗' : '↘';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getMetricIcon()}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(latestValue)}
          </p>
          {data.length > 1 && (
            <p className={`text-sm ${changeColor} flex items-center justify-end`}>
              <span className="mr-1">{changeIcon}</span>
              {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
      </div>
      
      <div style={{ height: `${height}px` }} className="relative">
        <SimpleLineChart data={data} metric={metric} height={height} />
      </div>
      
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{new Date(data[0].date).toLocaleDateString()}</span>
          <span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span>
        </div>
      )}
    </Card>
  );
};
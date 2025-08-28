import React from 'react';

interface ProgressBarProps {
  progress: number;
  isAnimated?: boolean;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isAnimated = true,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  className = ''
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600', 
    orange: 'bg-orange-600',
    red: 'bg-red-600'
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {clampedProgress.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full ${
            isAnimated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

interface LiveProgressBarProps {
  totalArtists: number;
  completedArtists: number;
  currentArtist: string;
  estimatedTimeRemaining: number;
  status: 'running' | 'completed' | 'error';
  error?: string;
  className?: string;
}

export const LiveProgressBar: React.FC<LiveProgressBarProps> = ({
  totalArtists,
  completedArtists,
  currentArtist,
  estimatedTimeRemaining,
  status,
  error,
  className = ''
}) => {
  const progress = totalArtists > 0 ? (completedArtists / totalArtists) * 100 : 0;
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      case 'running':
        return progress > 50 ? 'blue' : 'orange';
      default:
        return 'blue';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Scraping completed!';
      case 'error':
        return `Error: ${error}`;
      case 'running':
        return `Scraping ${currentArtist || 'artists'}...`;
      default:
        return 'Preparing to scrape...';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status and current artist */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
        {status === 'running' && estimatedTimeRemaining > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ETA: {formatTime(estimatedTimeRemaining)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar
        progress={progress}
        color={getStatusColor()}
        showPercentage={false}
        isAnimated={true}
      />

      {/* Progress details */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>
          {completedArtists} of {totalArtists} artists
        </span>
        <span>{progress.toFixed(0)}%</span>
      </div>

      {/* Current artist indicator */}
      {status === 'running' && currentArtist && (
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-gray-600 dark:text-gray-400">
            Currently processing: <span className="font-medium">{currentArtist}</span>
          </span>
        </div>
      )}

      {/* Error message */}
      {status === 'error' && error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Completion message */}
      {status === 'completed' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-700 dark:text-green-400">
            Successfully scraped {completedArtists} of {totalArtists} artists!
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
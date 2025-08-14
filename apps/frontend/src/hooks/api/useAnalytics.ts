import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import type {
  AnalyticsDashboard,
  StreamCampaignAnalytics,
  StreamMetric,
  CreateStreamMetric,
  PerformanceMetrics,
  ROICalculation,
} from '@campaign-manager/shared-types/analytics';

// Analytics Dashboard
export const useAnalyticsDashboard = () => {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async (): Promise<AnalyticsDashboard> => {
      const response = await apiClient.get('/analytics/dashboard');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Campaign Analytics
export const useCampaignAnalytics = (campaignId: string) => {
  return useQuery({
    queryKey: ['analytics', 'campaigns', campaignId, 'metrics'],
    queryFn: async (): Promise<StreamCampaignAnalytics> => {
      const response = await apiClient.get(`/analytics/campaigns/${campaignId}/metrics`);
      return response.data.data;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Campaign Performance Over Time
export const useCampaignPerformance = (
  campaignId: string,
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
) => {
  return useQuery({
    queryKey: ['analytics', 'campaigns', campaignId, 'performance', period],
    queryFn: async (): Promise<PerformanceMetrics> => {
      const response = await apiClient.get(`/analytics/campaigns/${campaignId}/performance`, {
        params: { period },
      });
      return response.data.data;
    },
    enabled: !!campaignId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Campaign ROI
export const useCampaignROI = (campaignId: string) => {
  return useQuery({
    queryKey: ['analytics', 'campaigns', campaignId, 'roi'],
    queryFn: async (): Promise<ROICalculation> => {
      const response = await apiClient.get(`/analytics/campaigns/${campaignId}/roi`);
      return response.data.data;
    },
    enabled: !!campaignId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Artist Performance
export const useArtistPerformance = (
  artistId: string,
  options: {
    campaignId?: string;
    platform?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
) => {
  return useQuery({
    queryKey: ['analytics', 'artists', artistId, 'performance', options],
    queryFn: async (): Promise<StreamMetric[]> => {
      const response = await apiClient.get(`/analytics/artists/${artistId}/performance`, {
        params: options,
      });
      return response.data.data;
    },
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create Stream Metric
export const useCreateStreamMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStreamMetric): Promise<StreamMetric> => {
      const response = await apiClient.post('/analytics/stream-metrics', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'artists', variables.artistId] });
      
      if (variables.campaignArtistId) {
        // Would need to get campaign ID to invalidate campaign queries
        queryClient.invalidateQueries({ queryKey: ['analytics', 'campaigns'] });
      }
    },
  });
};

// Refresh Campaign Analytics
export const useRefreshCampaignAnalytics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string): Promise<StreamCampaignAnalytics> => {
      const response = await apiClient.post(`/analytics/campaigns/${campaignId}/refresh`);
      return response.data.data;
    },
    onSuccess: (_, campaignId) => {
      // Invalidate campaign-related queries
      queryClient.invalidateQueries({ queryKey: ['analytics', 'campaigns', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboard'] });
    },
  });
};

// Helper hook for multiple campaign analytics
export const useMultipleCampaignAnalytics = (campaignIds: string[]) => {
  return useQuery({
    queryKey: ['analytics', 'campaigns', 'multiple', campaignIds.sort()],
    queryFn: async () => {
      const promises = campaignIds.map(async (id) => {
        const response = await apiClient.get(`/analytics/campaigns/${id}/metrics`);
        return response.data.data;
      });
      return Promise.all(promises);
    },
    enabled: campaignIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Combined analytics for comparison
export const useAnalyticsComparison = (campaignIds: string[]) => {
  const analytics = useMultipleCampaignAnalytics(campaignIds);
  
  return {
    ...analytics,
    data: analytics.data ? {
      campaigns: analytics.data.map((analytic, index) => ({
        id: campaignIds[index],
        name: `Campaign ${index + 1}`, // Would need campaign names from elsewhere
        metrics: {
          streams: analytic.totalStreams,
          followers: analytic.totalFollowers,
          engagement: analytic.engagementRate,
          roi: analytic.roi,
          costPerStream: analytic.costPerStream,
        },
      })),
      artists: [], // Would need to implement artist comparison
    } : undefined,
  };
};
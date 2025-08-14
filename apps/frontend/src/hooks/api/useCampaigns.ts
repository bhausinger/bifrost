import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Campaign query keys
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...campaignKeys.lists(), { filters }] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
  artists: (id: string) => [...campaignKeys.detail(id), 'artists'] as const,
};

// Get all campaigns
export const useCampaigns = () => {
  return useQuery({
    queryKey: campaignKeys.lists(),
    queryFn: () => apiClient.getCampaigns(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get single campaign
export const useCampaign = (id: string) => {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => apiClient.getCampaign(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Create campaign mutation
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
};

// Update campaign mutation
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateCampaign(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
};

// Delete campaign mutation
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCampaign(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: campaignKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
};

// Get campaign artists
export const useCampaignArtists = (campaignId: string) => {
  return useQuery({
    queryKey: campaignKeys.artists(campaignId),
    queryFn: () => apiClient.getCampaignArtists(campaignId),
    select: (data) => data.data,
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
  });
};

// Add artist to campaign mutation
export const useAddArtistToCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, artistId }: { campaignId: string; artistId: string }) => 
      apiClient.addArtistToCampaign(campaignId, artistId),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.artists(campaignId) });
    },
  });
};

// Add multiple artists to campaign mutation
export const useAddMultipleArtistsToCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, artistIds }: { campaignId: string; artistIds: string[] }) => 
      apiClient.addMultipleArtistsToCampaign(campaignId, artistIds),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.artists(campaignId) });
    },
  });
};

// Remove artist from campaign mutation
export const useRemoveArtistFromCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, artistId }: { campaignId: string; artistId: string }) => 
      apiClient.removeArtistFromCampaign(campaignId, artistId),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.artists(campaignId) });
    },
  });
};
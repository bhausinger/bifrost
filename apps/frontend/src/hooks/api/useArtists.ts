import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Artists query keys
export const artistKeys = {
  all: ['artists'] as const,
  lists: () => [...artistKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...artistKeys.lists(), { filters }] as const,
  details: () => [...artistKeys.all, 'detail'] as const,
  detail: (id: string) => [...artistKeys.details(), id] as const,
};

// Get all artists
export const useArtists = () => {
  return useQuery({
    queryKey: artistKeys.lists(),
    queryFn: () => apiClient.getArtists(),
    select: (data) => data.data, // Extract just the data array
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get single artist
export const useArtist = (id: string) => {
  return useQuery({
    queryKey: artistKeys.detail(id),
    queryFn: () => apiClient.getArtist(id),
    select: (data) => data.data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Create artist mutation
export const useCreateArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createArtist(data),
    onSuccess: () => {
      // Invalidate artists list to refetch
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
};

// Update artist mutation
export const useUpdateArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateArtist(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both the specific artist and the artists list
      queryClient.invalidateQueries({ queryKey: artistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
};

// Delete artist mutation
export const useDeleteArtist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteArtist(id),
    onSuccess: (_, id) => {
      // Remove the specific artist from cache and invalidate lists
      queryClient.removeQueries({ queryKey: artistKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: artistKeys.lists() });
    },
  });
};
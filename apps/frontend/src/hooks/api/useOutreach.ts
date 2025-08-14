import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Outreach query keys
export const outreachKeys = {
  all: ['outreach'] as const,
  campaigns: () => [...outreachKeys.all, 'campaigns'] as const,
  templates: () => [...outreachKeys.all, 'templates'] as const,
  campaignDetail: (id: string) => [...outreachKeys.campaigns(), id] as const,
  templateDetail: (id: string) => [...outreachKeys.templates(), id] as const,
};

// Gmail query keys
export const gmailKeys = {
  all: ['gmail'] as const,
  status: () => [...gmailKeys.all, 'status'] as const,
  authUrl: () => [...gmailKeys.all, 'authUrl'] as const,
};

// Outreach Campaigns
export const useOutreachCampaigns = () => {
  return useQuery({
    queryKey: outreachKeys.campaigns(),
    queryFn: () => apiClient.getOutreachCampaigns(),
    select: (data) => data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateOutreachCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createOutreachCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
    },
  });
};

// Email Templates
export const useEmailTemplates = () => {
  return useQuery({
    queryKey: outreachKeys.templates(),
    queryFn: () => apiClient.getEmailTemplates(),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.templates() });
    },
  });
};

// Gmail Integration
export const useGmailStatus = () => {
  return useQuery({
    queryKey: gmailKeys.status(),
    queryFn: () => apiClient.getGmailStatus(),
    select: (data) => data.data,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry on auth errors
  });
};

export const useGmailAuthUrl = () => {
  return useQuery({
    queryKey: gmailKeys.authUrl(),
    queryFn: () => apiClient.getGmailAuthUrl(),
    select: (data) => data.data,
    enabled: false, // Only fetch when explicitly called
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useGmailCallback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, state }: { code: string; state: string }) => 
      apiClient.handleGmailCallback(code, state),
    onSuccess: () => {
      // Refresh Gmail status after successful connection
      queryClient.invalidateQueries({ queryKey: gmailKeys.status() });
    },
  });
};
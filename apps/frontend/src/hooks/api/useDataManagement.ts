import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  duplicates: number;
  imported: any[];
}

export interface ValidationResult {
  valid: boolean;
  rowCount: number;
  preview: any[];
  warnings: string[];
  errors?: string[];
}

// Get import template
export const useGetImportTemplate = () => {
  return useMutation({
    mutationFn: async (type: string = 'artists') => {
      const response = await apiClient.get(`/data/import/template?type=${type}`, {
        responseType: 'blob',
      });
      return response.data;
    },
  });
};

// Validate import file
export const useValidateImport = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<ValidationResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/data/import/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
  });
};

// Import artists
export const useImportArtists = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/data/import/artists', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate artists queries
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'dashboard'] });
    },
  });
};

// Export campaigns
export const useExportCampaigns = () => {
  return useMutation({
    mutationFn: async (options: {
      format?: 'csv' | 'json';
      includeMetrics?: boolean;
      includeSocialProfiles?: boolean;
      startDate?: string;
      endDate?: string;
      campaignIds?: string[];
    } = {}) => {
      const params = new URLSearchParams();
      
      if (options.format) params.append('format', options.format);
      if (options.includeMetrics !== undefined) {
        params.append('includeMetrics', options.includeMetrics.toString());
      }
      if (options.includeSocialProfiles !== undefined) {
        params.append('includeSocialProfiles', options.includeSocialProfiles.toString());
      }
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.campaignIds && options.campaignIds.length > 0) {
        params.append('campaignIds', options.campaignIds.join(','));
      }

      const response = await apiClient.get(`/data/export/campaigns?${params.toString()}`, {
        responseType: 'blob',
      });
      
      return {
        data: response.data,
        filename: getFilenameFromResponse(response),
      };
    },
  });
};

// Export artists
export const useExportArtists = () => {
  return useMutation({
    mutationFn: async (options: {
      format?: 'csv' | 'json';
      includeMetrics?: boolean;
      includeSocialProfiles?: boolean;
      startDate?: string;
      endDate?: string;
      artistIds?: string[];
    } = {}) => {
      const params = new URLSearchParams();
      
      if (options.format) params.append('format', options.format);
      if (options.includeMetrics !== undefined) {
        params.append('includeMetrics', options.includeMetrics.toString());
      }
      if (options.includeSocialProfiles !== undefined) {
        params.append('includeSocialProfiles', options.includeSocialProfiles.toString());
      }
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.artistIds && options.artistIds.length > 0) {
        params.append('artistIds', options.artistIds.join(','));
      }

      const response = await apiClient.get(`/data/export/artists?${params.toString()}`, {
        responseType: 'blob',
      });
      
      return {
        data: response.data,
        filename: getFilenameFromResponse(response),
      };
    },
  });
};

// Export analytics
export const useExportAnalytics = () => {
  return useMutation({
    mutationFn: async (options: {
      format?: 'csv' | 'json';
      includeMetrics?: boolean;
      startDate?: string;
      endDate?: string;
      campaignIds?: string[];
    } = {}) => {
      const params = new URLSearchParams();
      
      if (options.format) params.append('format', options.format);
      if (options.includeMetrics !== undefined) {
        params.append('includeMetrics', options.includeMetrics.toString());
      }
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);
      if (options.campaignIds && options.campaignIds.length > 0) {
        params.append('campaignIds', options.campaignIds.join(','));
      }

      const response = await apiClient.get(`/data/export/analytics?${params.toString()}`, {
        responseType: 'blob',
      });
      
      return {
        data: response.data,
        filename: getFilenameFromResponse(response),
      };
    },
  });
};

// Create backup
export const useCreateBackup = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/data/backup', {}, {
        responseType: 'blob',
      });
      
      return {
        data: response.data,
        filename: getFilenameFromResponse(response),
      };
    },
  });
};

// Get data statistics
export const useDataStats = () => {
  return useQuery({
    queryKey: ['data', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/data/stats');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Helper function to extract filename from response headers
function getFilenameFromResponse(response: any): string {
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      return filenameMatch[1];
    }
  }
  return `download-${new Date().toISOString().slice(0, 10)}.csv`;
}

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
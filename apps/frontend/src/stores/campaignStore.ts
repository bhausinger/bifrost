import { create } from 'zustand';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignState {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCampaigns: () => Promise<void>;
  createCampaign: (data: CreateCampaignData) => Promise<void>;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  selectCampaign: (campaign: Campaign | null) => void;
  clearError: () => void;
}

interface CreateCampaignData {
  name: string;
  description?: string;
  type: string;
  startDate: string;
  endDate?: string;
  budget?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  selectedCampaign: null,
  isLoading: false,
  error: null,

  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      set({ campaigns: data.data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch campaigns',
        isLoading: false,
      });
    }
  },

  createCampaign: async (data: CreateCampaignData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create campaign');
      }

      const newCampaign = await response.json();
      set(state => ({
        campaigns: [...state.campaigns, newCampaign.data],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create campaign',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCampaign: async (id: string, data: Partial<Campaign>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update campaign');
      }

      const updatedCampaign = await response.json();
      set(state => ({
        campaigns: state.campaigns.map(c => c.id === id ? updatedCampaign.data : c),
        selectedCampaign: state.selectedCampaign?.id === id ? updatedCampaign.data : state.selectedCampaign,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update campaign',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      set(state => ({
        campaigns: state.campaigns.filter(c => c.id !== id),
        selectedCampaign: state.selectedCampaign?.id === id ? null : state.selectedCampaign,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete campaign',
        isLoading: false,
      });
      throw error;
    }
  },

  selectCampaign: (campaign: Campaign | null) => {
    set({ selectedCampaign: campaign });
  },

  clearError: () => {
    set({ error: null });
  },
}));
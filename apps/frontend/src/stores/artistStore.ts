import { create } from 'zustand';

export interface Artist {
  id: string;
  name: string;
  soundcloud_url: string | null;
  genre: string | null;
  follower_count: number;
  track_count: number;
  location: string | null;
  description: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  discovery_source: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DiscoveredArtist {
  id: string;
  name: string;
  soundcloud_url: string;
  avatar_url: string;
  follower_count: number;
  track_count: number;
  location: string;
  description: string;
  is_verified: boolean;
  genre: string;
  discovery_source: string;
  tags: string[];
}

export interface DiscoverySearchParams {
  query: string;
  genre?: string;
  source?: string;
  limit?: number;
  anchorArtist?: string;
  searchType?: 'keyword' | 'similar_to_anchor' | 'ai_recommendations';
  aiPrompt?: string;
}

export interface AIArtistSuggestion {
  name: string;
  reason: string;
  genre: string;
  similarTo: string[];
  estimatedFollowers: string;
  hasEmail?: boolean;
  emailStatus?: 'found' | 'not_found' | 'checking' | 'error';
  contactInfo?: {
    email?: string;
    socialLinks?: string[];
  };
}

interface ArtistStore {
  // State
  artists: Artist[];
  discoveredArtists: DiscoveredArtist[];
  aiSuggestions: AIArtistSuggestion[];
  isLoading: boolean;
  isDiscovering: boolean;
  isGeneratingAI: boolean;
  isScrapingEmails: boolean;
  error: string | null;
  lastSearchQuery: string | null;
  lastAIPrompt: string | null;

  // Actions
  fetchArtists: () => Promise<void>;
  discoverArtists: (params: DiscoverySearchParams) => Promise<void>;
  generateAIRecommendations: (prompt: string) => Promise<void>;
  scrapeArtistEmails: (artists: string[]) => Promise<void>;
  saveDiscoveredArtist: (artist: DiscoveredArtist) => Promise<void>;
  clearDiscoveredArtists: () => void;
  clearAISuggestions: () => void;
  clearError: () => void;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    // Development bypass for benjamin.hausinger@gmail.com
    ...(!token && process.env.NODE_ENV === 'development' && {
      'X-Admin-Bypass': 'benjamin.hausinger@gmail.com'
    }),
  };
};

export const useArtistStore = create<ArtistStore>((set, get) => ({
  // Initial state
  artists: [],
  discoveredArtists: [],
  aiSuggestions: [],
  isLoading: false,
  isDiscovering: false,
  isGeneratingAI: false,
  isScrapingEmails: false,
  error: null,
  lastSearchQuery: null,
  lastAIPrompt: null,

  // Fetch saved artists
  fetchArtists: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/artists', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }

      const data = await response.json();
      set({ artists: data.data || [], isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch artists',
        isLoading: false 
      });
    }
  },

  // Discover new artists
  discoverArtists: async (params: DiscoverySearchParams) => {
    set({ isDiscovering: true, error: null, lastSearchQuery: params.query });
    try {
      const response = await fetch('/api/artists/discover', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to discover artists');
      }

      const data = await response.json();
      set({ 
        discoveredArtists: data.data || [],
        isDiscovering: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to discover artists',
        isDiscovering: false 
      });
    }
  },

  // Save discovered artist to database
  saveDiscoveredArtist: async (artist: DiscoveredArtist) => {
    try {
      const response = await fetch('/api/artists/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(artist),
      });

      if (!response.ok) {
        throw new Error('Failed to save artist');
      }

      const data = await response.json();
      
      // Add to saved artists list
      set(state => ({
        artists: [...state.artists, data.data],
        // Remove from discovered artists
        discoveredArtists: state.discoveredArtists.filter(a => a.id !== artist.id)
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to save artist'
      });
      throw error;
    }
  },

  // Generate AI recommendations
  generateAIRecommendations: async (prompt: string) => {
    set({ isGeneratingAI: true, error: null, lastAIPrompt: prompt });
    try {
      const response = await fetch('/api/artists/ai-recommend', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI recommendations');
      }

      const data = await response.json();
      set({ 
        aiSuggestions: data.suggestions || [],
        isGeneratingAI: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate AI recommendations',
        isGeneratingAI: false 
      });
    }
  },

  // Scrape emails for AI suggested artists
  scrapeArtistEmails: async (artistNames: string[]) => {
    set({ isScrapingEmails: true, error: null });
    try {
      const response = await fetch('/api/artists/ai/scrape-emails', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ artistNames }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape artist emails');
      }

      const data = await response.json();
      
      // Update AI suggestions with email information
      set(state => ({
        aiSuggestions: state.aiSuggestions.map(suggestion => {
          const emailData = data.results.find((r: any) => r.artist === suggestion.name);
          if (emailData) {
            return {
              ...suggestion,
              hasEmail: emailData.hasEmail,
              emailStatus: emailData.emailStatus,
              contactInfo: emailData.contactInfo
            };
          }
          return suggestion;
        }),
        isScrapingEmails: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to scrape artist emails',
        isScrapingEmails: false 
      });
    }
  },

  // Clear discovered artists
  clearDiscoveredArtists: () => {
    set({ discoveredArtists: [], lastSearchQuery: null });
  },

  // Clear AI suggestions
  clearAISuggestions: () => {
    set({ aiSuggestions: [], lastAIPrompt: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
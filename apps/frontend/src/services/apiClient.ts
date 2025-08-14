const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  message: string;
  data: T;
  count?: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private getAuthToken(): string | null {
    // Get token from localStorage (where it's persisted by Zustand)
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(data: LoginData): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterData): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.request<null>('/auth/logout', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string; resetUrl?: string }>> {
    return this.request<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Artists endpoints
  async getArtists(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/artists');
  }

  async getArtist(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/artists/${id}`);
  }

  async createArtist(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/artists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateArtist(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/artists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteArtist(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/artists/${id}`, {
      method: 'DELETE',
    });
  }

  // Campaigns endpoints
  async getCampaigns(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/campaigns');
  }

  async getCampaign(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/campaigns/${id}`);
  }

  async createCampaign(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  // Campaign-Artist association endpoints
  async getCampaignArtists(campaignId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/campaigns/${campaignId}/artists`);
  }

  async addArtistToCampaign(campaignId: string, artistId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/campaigns/${campaignId}/artists`, {
      method: 'POST',
      body: JSON.stringify({ artistId }),
    });
  }

  async addMultipleArtistsToCampaign(campaignId: string, artistIds: string[]): Promise<ApiResponse<any>> {
    return this.request<any>(`/campaigns/${campaignId}/artists/bulk`, {
      method: 'POST',
      body: JSON.stringify({ artistIds }),
    });
  }

  async removeArtistFromCampaign(campaignId: string, artistId: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/campaigns/${campaignId}/artists/${artistId}`, {
      method: 'DELETE',
    });
  }

  // Outreach endpoints
  async getOutreachCampaigns(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/outreach/campaigns');
  }

  async createOutreachCampaign(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/outreach/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmailTemplates(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/outreach/templates');
  }

  async createEmailTemplate(data: any): Promise<ApiResponse<any>> {
    return this.request<any>('/outreach/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Gmail endpoints
  async getGmailStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/gmail/status');
  }

  async getGmailAuthUrl(): Promise<ApiResponse<{ authUrl: string }>> {
    return this.request<{ authUrl: string }>('/gmail/auth-url');
  }

  async handleGmailCallback(code: string, state: string): Promise<ApiResponse<any>> {
    return this.request<any>('/gmail/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }
}

export const apiClient = new ApiClient();
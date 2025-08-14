import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 86400,
      },
    });
  }),

  // Mock campaigns endpoints
  http.get('/api/campaigns', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'campaign-1',
          name: 'Test Campaign',
          description: 'A test campaign',
          type: 'promotion',
          status: 'active',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          budget: 5000,
          metrics: {
            totalReach: 10000,
            totalPlays: 5000,
            engagementRate: 0.15,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  }),

  // Mock artists endpoints
  http.get('/api/artists', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'artist-1',
          name: 'Test Artist',
          displayName: 'Test Artist Official',
          genres: ['electronic'],
          location: 'Test City',
          verificationStatus: 'verified',
          socialProfiles: [
            {
              platform: 'soundcloud',
              username: 'testartist',
              url: 'https://soundcloud.com/testartist',
              followersCount: 5000,
              isVerified: true,
            },
          ],
          metrics: {
            totalFollowers: 5000,
            totalPlays: 100000,
            averageEngagement: 0.08,
          },
        },
      ],
    });
  }),
];

export const server = setupServer(...handlers);
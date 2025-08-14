# API Documentation

This document describes the REST API endpoints for the Campaign Manager platform.

## 🔗 Base URLs

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`
- **Scraper Service**: `http://localhost:8000/api` (dev) / `https://your-domain.com/scraper/api` (prod)

## 🔐 Authentication

Most endpoints require authentication using JWT tokens.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 86400
  }
}
```

### Using Authentication

Include the access token in the Authorization header:

```http
Authorization: Bearer your-jwt-access-token
```

## 📋 Campaigns API

### List Campaigns

```http
GET /campaigns?page=1&limit=20&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "campaign-id",
      "name": "Summer Music Campaign",
      "description": "Promoting summer vibes",
      "type": "promotion",
      "status": "active",
      "startDate": "2024-06-01T00:00:00Z",
      "endDate": "2024-08-31T23:59:59Z",
      "budget": 5000,
      "targetCriteria": {
        "genres": ["electronic", "house"],
        "platforms": ["soundcloud", "spotify"],
        "minFollowers": 1000,
        "maxFollowers": 50000
      },
      "metrics": {
        "totalReach": 15000,
        "totalPlays": 8500,
        "engagementRate": 0.12
      },
      "createdAt": "2024-05-15T10:00:00Z",
      "updatedAt": "2024-05-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Create Campaign

```http
POST /campaigns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Campaign",
  "description": "Campaign description",
  "type": "promotion",
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-08-31T23:59:59Z",
  "budget": 3000,
  "targetCriteria": {
    "genres": ["electronic"],
    "platforms": ["soundcloud"],
    "minFollowers": 500,
    "maxFollowers": 10000
  },
  "tags": ["summer", "electronic"]
}
```

### Get Campaign

```http
GET /campaigns/{id}
Authorization: Bearer {token}
```

### Update Campaign

```http
PUT /campaigns/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "paused"
}
```

### Delete Campaign

```http
DELETE /campaigns/{id}
Authorization: Bearer {token}
```

## 🎵 Artists API

### List Artists

```http
GET /artists?page=1&limit=20&genre=electronic&platform=soundcloud
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "artist-id",
      "name": "DJ Example",
      "displayName": "DJ Example Official",
      "bio": "Electronic music producer",
      "genres": ["electronic", "house"],
      "location": "Berlin, Germany",
      "profileImageUrl": "https://example.com/avatar.jpg",
      "verificationStatus": "verified",
      "socialProfiles": [
        {
          "platform": "soundcloud",
          "username": "djexample",
          "url": "https://soundcloud.com/djexample",
          "followersCount": 15000,
          "isVerified": true
        }
      ],
      "metrics": {
        "totalFollowers": 15000,
        "totalPlays": 250000,
        "averageEngagement": 0.08,
        "monthlyListeners": 12000
      },
      "contactInfo": {
        "email": "booking@djexample.com",
        "website": "https://djexample.com"
      },
      "discoveredAt": "2024-05-01T12:00:00Z"
    }
  ]
}
```

### Discover Artists

```http
POST /artists/discover
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "electronic music",
  "genres": ["electronic", "house"],
  "platforms": ["soundcloud"],
  "minFollowers": 1000,
  "maxFollowers": 50000,
  "location": "Berlin",
  "limit": 50
}
```

### Create Artist

```http
POST /artists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Artist",
  "genres": ["electronic"],
  "socialProfiles": [
    {
      "platform": "soundcloud",
      "username": "newartist",
      "url": "https://soundcloud.com/newartist"
    }
  ]
}
```

## 📧 Outreach API

### List Outreach Campaigns

```http
GET /outreach/campaigns?status=active
Authorization: Bearer {token}
```

### Create Outreach Campaign

```http
POST /outreach/campaigns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Summer Outreach 2024",
  "description": "Reaching out to electronic artists",
  "templateId": "template-id",
  "targetArtistIds": ["artist-1", "artist-2"],
  "scheduledStartDate": "2024-06-01T09:00:00Z",
  "sendingSchedule": {
    "timezone": "UTC",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "startTime": "09:00",
    "endTime": "17:00",
    "maxEmailsPerDay": 50,
    "delayBetweenEmails": 60
  }
}
```

### Send Emails

```http
POST /outreach/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "campaignId": "campaign-id",
  "artistIds": ["artist-1", "artist-2"],
  "scheduleFor": "2024-06-01T10:00:00Z"
}
```

### Email Templates

```http
GET /outreach/templates
POST /outreach/templates
PUT /outreach/templates/{id}
DELETE /outreach/templates/{id}
```

## 📊 Analytics API

### Dashboard Stats

```http
GET /analytics/dashboard?period=month
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalCampaigns": {
        "value": 12,
        "change": 3,
        "changePercentage": 33.3
      },
      "totalArtists": {
        "value": 450,
        "change": 25,
        "changePercentage": 5.9
      },
      "emailsSent": {
        "value": 1250,
        "change": 150,
        "changePercentage": 13.6
      }
    },
    "charts": {
      "campaignPerformance": {
        "type": "line",
        "data": [
          {
            "timestamp": "2024-05-01T00:00:00Z",
            "value": 100
          }
        ]
      }
    }
  }
}
```

### Campaign Analytics

```http
GET /analytics/campaigns/{id}/metrics?period=week
Authorization: Bearer {token}
```

### Artist Performance

```http
GET /analytics/artists/{id}/performance?period=month
Authorization: Bearer {token}
```

## 💰 Finance API

### List Transactions

```http
GET /finance/transactions?type=income&category=campaign_revenue
Authorization: Bearer {token}
```

### Create Transaction

```http
POST /finance/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "expense",
  "category": "marketing",
  "amount": {
    "amount": 500,
    "currency": "USD"
  },
  "description": "Facebook Ads Campaign",
  "paymentMethod": "credit_card",
  "transactionDate": "2024-05-20T10:00:00Z",
  "campaignId": "campaign-id"
}
```

### Generate P&L Report

```http
POST /finance/reports/pnl
Authorization: Bearer {token}
Content-Type: application/json

{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "format": "json"
}
```

## 🤖 Scraper API

The scraper service runs on a separate port and provides SoundCloud scraping capabilities.

### Scrape Artist

```http
POST /soundcloud/artist
Content-Type: application/json

{
  "username": "artistusername",
  "include_tracks": true,
  "max_tracks": 50
}
```

**Response:**
```json
{
  "id": "artist-id",
  "username": "artistusername",
  "display_name": "Artist Name",
  "url": "https://soundcloud.com/artistusername",
  "followers_count": 15000,
  "track_count": 45,
  "tracks": [
    {
      "id": "track-id",
      "title": "Track Title",
      "url": "https://soundcloud.com/artistusername/track-title",
      "play_count": 5000,
      "like_count": 250
    }
  ]
}
```

### Search SoundCloud

```http
POST /soundcloud/search
Content-Type: application/json

{
  "query": "electronic music",
  "limit": 20,
  "search_type": "artists"
}
```

### Discover Similar Artists

```http
POST /discovery/similar
Content-Type: application/json

{
  "artist_name": "Deadmau5",
  "genre": "electronic",
  "limit": 10
}
```

## ❌ Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "context": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-05-20T10:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Resource already exists |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded |
| `EXTERNAL_SERVICE_ERROR` | 503 | External service unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

## 🔄 Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **General API**: 60 requests per minute per IP
- **Scraper API**: 10 requests per minute per IP
- **Authentication**: 5 login attempts per minute per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1621234567
```

## 📄 Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc` (default: desc)

## 🔍 Filtering

Many endpoints support filtering with query parameters:

```http
GET /artists?genre=electronic&minFollowers=1000&location=Berlin
GET /campaigns?status=active&type=promotion
GET /finance/transactions?type=expense&startDate=2024-01-01
```

## 📚 SDKs and Tools

- **JavaScript/TypeScript**: `@campaign-manager/api-client` (coming soon)
- **Python**: `campaign-manager-python` (coming soon)
- **Postman Collection**: Available in `/docs/postman/`
- **OpenAPI Spec**: Available at `/api/docs` (Swagger UI)
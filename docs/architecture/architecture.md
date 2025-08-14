# Architecture Overview

This document provides a comprehensive overview of the Campaign Manager platform architecture.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Web Browser   │  │   Mobile App    │  │  External APIs  │ │
│  │    (React)      │  │   (React Native)│  │  (Third Party)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │      Nginx      │  │   Load Balancer │  │       CDN       │ │
│  │  Reverse Proxy  │  │   (AWS ALB)     │  │  (CloudFlare)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Frontend     │  │     Backend     │  │    Scraper      │ │
│  │   React SPA     │  │   Express API   │  │   FastAPI       │ │
│  │   (TypeScript)  │  │  (TypeScript)   │  │   (Python)      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │      Redis      │  │   File Storage  │ │
│  │   (Supabase)    │  │     Cache       │  │     (AWS S3)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Component Architecture

### Frontend Application (React)

```
Frontend (apps/frontend/)
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Basic UI elements (Button, Input, etc.)
│   │   ├── layout/          # Layout components (Header, Sidebar)
│   │   ├── campaigns/       # Campaign-specific components
│   │   ├── artists/         # Artist-specific components
│   │   ├── outreach/        # Outreach-specific components
│   │   └── analytics/       # Analytics components
│   ├── pages/               # Route-level components
│   │   ├── Dashboard.tsx
│   │   ├── campaigns/
│   │   ├── artists/
│   │   └── settings/
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useCampaigns.ts
│   │   └── useAnalytics.ts
│   ├── stores/              # Zustand state management
│   │   ├── authStore.ts
│   │   ├── campaignStore.ts
│   │   └── uiStore.ts
│   ├── services/            # API client functions
│   │   ├── api.ts
│   │   ├── campaigns.ts
│   │   └── artists.ts
│   └── utils/               # Utility functions
│       ├── format.ts
│       └── validation.ts
```

**Key Technologies:**
- **React 18**: Component framework with concurrent features
- **TypeScript**: Type safety and developer experience
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Query**: Server state management and caching
- **React Router**: Client-side routing
- **React Hook Form**: Form management with validation

### Backend API (Node.js + Express)

```
Backend (apps/server/)
├── src/
│   ├── controllers/         # Request handlers
│   │   ├── AuthController.ts
│   │   ├── CampaignController.ts
│   │   └── ArtistController.ts
│   ├── models/              # Database models (Prisma)
│   │   ├── User.ts
│   │   ├── Campaign.ts
│   │   └── Artist.ts
│   ├── routes/              # Express route definitions
│   │   ├── auth.ts
│   │   ├── campaigns.ts
│   │   └── artists.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── services/            # Business logic layer
│   │   ├── AuthService.ts
│   │   ├── EmailService.ts
│   │   └── AnalyticsService.ts
│   ├── utils/               # Utility functions
│   │   ├── jwt.ts
│   │   └── logger.ts
│   └── config/              # Configuration
│       └── database.ts
```

**Key Technologies:**
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type safety
- **Prisma**: Database ORM and migrations
- **JWT**: Authentication tokens
- **Zod**: Runtime type validation
- **Winston**: Logging
- **Redis**: Caching and session storage

### Scraper Service (Python + FastAPI)

```
Scraper (apps/scraper/)
├── src/
│   ├── api/                 # FastAPI route handlers
│   │   └── routes/
│   │       ├── soundcloud.py
│   │       └── discovery.py
│   ├── services/            # Scraping business logic
│   │   ├── soundcloud_scraper.py
│   │   └── artist_discovery.py
│   ├── models/              # Pydantic data models
│   │   └── schemas.py
│   ├── core/                # Core utilities
│   │   ├── database.py
│   │   └── logging.py
│   └── config/              # Configuration
│       └── settings.py
```

**Key Technologies:**
- **Python 3.11**: Programming language
- **FastAPI**: Modern web framework
- **Pydantic**: Data validation and serialization
- **BeautifulSoup**: HTML parsing
- **Selenium**: Browser automation
- **SQLAlchemy**: Database ORM
- **Celery**: Background task processing
- **Redis**: Task queue and caching

## 🗃️ Data Architecture

### Database Schema Overview

```sql
-- Core entities
Users (id, email, password_hash, role, created_at, updated_at)
Campaigns (id, user_id, name, type, status, start_date, end_date, budget)
Artists (id, name, soundcloud_username, genres, location, verified)
Outreach_Campaigns (id, user_id, name, template_id, status, scheduled_start)
Email_Templates (id, user_id, name, subject, body, type)
Email_Records (id, outreach_campaign_id, artist_id, status, sent_at)
Transactions (id, user_id, type, amount, category, description, date)
Analytics_Events (id, entity_type, entity_id, event_type, data, timestamp)

-- Relationships
Campaign_Artists (campaign_id, artist_id, added_at, status)
Artist_Social_Profiles (artist_id, platform, username, url, followers_count)
User_Settings (user_id, key, value, updated_at)
```

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │    Database     │
│                 │    │                 │    │                 │
│  User Actions   │───▶│  API Requests   │───▶│  SQL Queries    │
│  Form Submits   │    │  Validation     │    │  Data Storage   │
│  Page Views     │    │  Business Logic │    │  Relationships  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │     Redis       │    │   Supabase      │
         │              │                 │    │                 │
         └──────────────│  Cache Layer    │    │  Enhanced PG    │
                        │  Session Store  │    │  Real-time      │
                        │  Rate Limiting  │    │  Auth & APIs    │
                        └─────────────────┘    └─────────────────┘
```

## 🔄 Service Communication

### API Communication Flow

```
Frontend ←→ Backend API ←→ Database
    │           │
    │           └─→ Redis (Cache)
    │           │
    │           └─→ Scraper Service ←→ External APIs
    │                   │
    │                   └─→ Background Jobs
    │
    └─→ CDN (Static Assets)
```

### Authentication Flow

```
1. User Login Request
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  Frontend   │───▶│   Backend   │───▶│  Database   │
   │             │    │ Validate    │    │ User Check  │
   └─────────────┘    │ Credentials │    └─────────────┘
                      └─────────────┘

2. JWT Token Generation
   ┌─────────────┐    ┌─────────────┐
   │   Backend   │───▶│  Frontend   │
   │ Generate    │    │ Store Token │
   │ JWT Tokens  │    │ in Memory   │
   └─────────────┘    └─────────────┘

3. Authenticated Requests
   ┌─────────────┐    ┌─────────────┐
   │  Frontend   │───▶│   Backend   │
   │ Send Token  │    │ Verify JWT  │
   │ in Header   │    │ Authorize   │
   └─────────────┘    └─────────────┘
```

### Real-time Updates

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │    Supabase     │
│                 │    │                 │    │                 │
│  Subscribe to   │◄──▶│  WebSocket      │◄──▶│  Real-time      │
│  Campaign       │    │  Connection     │    │  Subscriptions  │
│  Updates        │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Frontend      │  │   API Gateway   │  │   Application   │ │
│  │   • Input       │  │   • Rate        │  │   • JWT         │ │
│  │     Validation  │  │     Limiting    │  │     Validation  │ │
│  │   • XSS         │  │   • CORS        │  │   • RBAC        │ │
│  │     Protection  │  │   • SSL/TLS     │  │   • Input       │ │
│  └─────────────────┘  └─────────────────┘  │     Sanitization│ │
└─────────────────────────────────────────────┴─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Security                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Database      │  │   Encryption    │  │   Backup &      │ │
│  │   • Row Level   │  │   • At Rest     │  │     Recovery    │ │
│  │     Security    │  │   • In Transit  │  │   • Point-in-   │ │
│  │   • Audit Logs  │  │   • Secrets     │  │     time        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Protection

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Data   │    │  Transmission   │    │  Server Data    │
│                 │    │                 │    │                 │
│  • Form         │───▶│  • HTTPS/TLS    │───▶│  • Encrypted    │
│    Validation   │    │  • Certificate  │    │    Storage      │
│  • Sanitization│    │    Pinning      │    │  • Access       │
│  • CSRF Tokens │    │  • HSTS Headers │    │    Control      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Monitoring & Observability

### Logging Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Log           │    │   Storage &     │
│   Logs          │    │   Aggregation   │    │   Analysis      │
│                 │    │                 │    │                 │
│  • API Requests │───▶│  • Fluentd/     │───▶│  • Elasticsearch│
│  • Errors       │    │    Logstash     │    │  • Kibana       │
│  • Performance │    │  • Filtering    │    │  • Grafana      │
│  • Business     │    │  • Enrichment   │    │  • Alerts       │
│    Events       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Metrics Collection

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Metrics       │    │   Collection    │    │   Monitoring    │
│   Sources       │    │                 │    │                 │
│                 │    │  • Prometheus   │    │  • Grafana      │
│  • Node.js      │───▶│  • Custom       │───▶│    Dashboards  │
│    Metrics      │    │    Metrics      │    │  • Alertmanager │
│  • Database     │    │  • Service      │    │  • PagerDuty    │
│  • Redis        │    │    Discovery    │    │    Integration  │
│  • Custom KPIs  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Scalability Strategy

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                      Load Balancer                             │
│                    (AWS ALB / Nginx)                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│     Frontend        │ │     Backend         │ │     Scraper         │
│     Instance 1      │ │     Instance 1      │ │     Instance 1      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│     Frontend        │ │     Backend         │ │     Scraper         │
│     Instance 2      │ │     Instance 2      │ │     Instance 2      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│     Frontend        │ │     Backend         │ │     Scraper         │
│     Instance N      │ │     Instance N      │ │     Instance N      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Database Scaling

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Primary     │    │   Read Replica  │    │   Read Replica  │
│    Database     │───▶│   (Region A)    │    │   (Region B)    │
│   (Read/Write)  │    │   (Read Only)   │    │   (Read Only)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Connection    │
│     Pooling     │
│   (PgBouncer)   │
└─────────────────┘
```

### Caching Strategy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │      CDN        │    │   Redis Cache   │
│   Cache         │    │   (CloudFlare)  │    │                 │
│                 │    │                 │    │  • Session      │
│  • Static       │    │  • Static       │    │    Storage      │
│    Assets       │    │    Assets       │    │  • API          │
│  • API          │    │  • Images       │    │    Responses    │
│    Responses    │    │  • CSS/JS       │    │  • Rate         │
│  (Short TTL)    │    │  (Long TTL)     │    │    Limiting     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🧪 Testing Strategy

### Testing Pyramid

```
                    ┌─────────────────┐
                    │       E2E       │
                    │    (Playwright) │
                    └─────────────────┘
                 ┌─────────────────────────┐
                 │      Integration        │
                 │    (API Testing)        │
                 └─────────────────────────┘
            ┌─────────────────────────────────────┐
            │              Unit                   │
            │   (Components, Functions, etc.)     │
            └─────────────────────────────────────┘
```

### Test Coverage

- **Frontend**: Component testing, Hook testing, E2E flows
- **Backend**: API endpoint testing, Service layer testing
- **Database**: Migration testing, Query performance
- **Integration**: Service-to-service communication
- **Performance**: Load testing, Stress testing

## 📈 Performance Considerations

### Frontend Optimization

- **Code Splitting**: Route-based and component-based
- **Lazy Loading**: Images, components, routes
- **Bundle Optimization**: Tree shaking, minification
- **Caching**: Service workers, HTTP caching
- **Asset Optimization**: Image compression, WebP format

### Backend Optimization

- **Database Queries**: Indexing, query optimization
- **Caching**: Redis for frequently accessed data
- **Connection Pooling**: Database connections
- **Compression**: Response compression (gzip)
- **Rate Limiting**: Protect against abuse

### Infrastructure Optimization

- **CDN**: Global content distribution
- **Load Balancing**: Traffic distribution
- **Auto Scaling**: Dynamic resource allocation
- **Resource Monitoring**: CPU, memory, disk usage
- **Database Optimization**: Query analysis, index tuning

## 🔮 Future Architecture Considerations

### Microservices Evolution

As the platform grows, consider breaking into microservices:

- **User Service**: Authentication and user management
- **Campaign Service**: Campaign CRUD and logic
- **Artist Service**: Artist data and discovery
- **Outreach Service**: Email campaigns and templates
- **Analytics Service**: Data processing and reporting
- **Notification Service**: Real-time notifications

### Event-Driven Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Service A    │───▶│  Message Bus    │───▶│    Service B    │
│  (Publisher)    │    │  (EventBridge)  │    │  (Subscriber)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Advanced Monitoring

- **Distributed Tracing**: Track requests across services
- **APM Tools**: Application performance monitoring
- **Chaos Engineering**: Resilience testing
- **ML-based Alerts**: Anomaly detection

This architecture provides a solid foundation for the Campaign Manager platform while allowing for future growth and scaling needs.
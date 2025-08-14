# Campaign Manager - Claude Code Reference

## Project Overview

A comprehensive music promotion campaign management platform designed to scale to $400K revenue. The platform helps users reach out to artists to promote their music through SoundCloud and other services.

### Key Features
- **Campaign Tracker**: Track campaigns with stream counts over time
- **Discovery**: AI wrapper for finding similar artists + SoundCloud scraping
- **Outreach**: Gmail integration for email campaigns with templates and tracking
- **P&L**: Expense and revenue tracking

### Target Users
- Music promoters
- Artist managers
- Record labels
- Independent artists

## Architecture

**Monorepo Structure**: Turborepo + PNPM workspaces
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (Port 3002)
- **Backend**: Node.js + Express + TypeScript + Prisma + Supabase (Port 5000)
- **Scraper**: Python + FastAPI + BeautifulSoup (Port 8000)
- **Database**: PostgreSQL + Redis
- **Infrastructure**: Docker + Nginx

## Tech Stack Details

### Frontend (`apps/frontend`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand
- **API Client**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + Playwright
- **Storybook**: Component development

### Backend (`apps/server`)
- **Runtime**: Node.js with Express + TypeScript
- **Database**: Supabase (PostgreSQL) with Prisma ORM
- **Authentication**: JWT + Supabase Auth
- **API**: RESTful endpoints with OpenAPI/Swagger docs
- **Email**: Nodemailer + Gmail integration
- **Caching**: Redis for sessions and API responses
- **Testing**: Jest + Supertest
- **Security**: Helmet, CORS, rate limiting

### Python Scraper (`apps/scraper`)
- **Framework**: FastAPI with async support
- **Web Scraping**: BeautifulSoup4 + requests
- **AI Integration**: OpenAI API for artist similarity
- **Task Queue**: Redis for background jobs
- **Database**: SQLAlchemy (when compatible packages available)
- **Testing**: pytest + pytest-asyncio

### Shared Packages (`packages/`)
- **shared-types**: TypeScript definitions shared across services
- **shared-utils**: Common utilities and helpers
- **shared-config**: Configuration schemas and validation

## Environment Setup

### Prerequisites
- Node.js 18+ (for frontend/backend)
- Python 3.13+ (for scraper)
- Docker & Docker Compose
- PNPM package manager
- Git

### Port Configuration
- **Frontend**: http://localhost:3002
- **Backend**: http://localhost:5000
- **Scraper**: http://localhost:8000
- **Nginx**: http://localhost:80
- **Database**: localhost:5432
- **Redis**: localhost:6379

### Environment Variables

#### Frontend (`.env`)
```bash
VITE_API_URL=http://localhost:5000
VITE_SCRAPER_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (`.env`)
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/campaign_manager
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
REDIS_URL=redis://localhost:6379
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
```

#### Scraper (`.env`)
```bash
DEBUG=true
PORT=8000
REDIS_URL=redis://localhost:6379/1
OPENAI_API_KEY=your_openai_api_key
```

## Development Commands

### Root Level
```bash
# Install all dependencies
pnpm install

# Start all services in development
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint all code
pnpm lint

# Type check all TypeScript
pnpm typecheck
```

### Frontend Specific
```bash
# Navigate to frontend
cd apps/frontend

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run Storybook
pnpm storybook

# Run E2E tests
pnpm test:e2e
```

### Backend Specific
```bash
# Navigate to server
cd apps/server

# Start dev server
pnpm dev

# Run database migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Reset database
pnpm db:reset

# Seed database
pnpm db:seed

# Run tests
pnpm test
```

### Python Scraper
```bash
# Navigate to scraper
cd apps/scraper

# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
uvicorn main:app --reload --port 8000

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

## Database Schema

### Key Models
- **User**: Authentication and profile data
- **Campaign**: Campaign tracking with metrics
- **Artist**: Artist profiles and metadata
- **SocialProfile**: Social media links and handles
- **OutreachCampaign**: Email campaign management
- **EmailTemplate**: Reusable email templates
- **EmailRecord**: Email send tracking
- **Transaction**: Financial tracking for P&L

### Relationships
- User → Campaigns (1:many)
- Campaign → Artists (many:many)
- User → OutreachCampaigns (1:many)
- OutreachCampaign → EmailRecords (1:many)

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - User logout

### Campaigns
- `GET /campaigns` - List user campaigns
- `POST /campaigns` - Create new campaign
- `GET /campaigns/:id` - Get campaign details
- `PUT /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign

### Artists
- `GET /artists` - Search artists
- `POST /artists` - Add new artist
- `GET /artists/:id` - Get artist details
- `PUT /artists/:id` - Update artist

### Outreach
- `GET /outreach` - List outreach campaigns
- `POST /outreach` - Create outreach campaign
- `GET /templates` - List email templates
- `POST /templates` - Create email template

### Scraper API
- `POST /scrape/soundcloud` - Scrape SoundCloud profile
- `POST /ai/similar-artists` - Find similar artists
- `GET /health` - Health check

## Docker Setup

### Development
```bash
# Start all services
docker-compose up --build

# Start specific service
docker-compose up frontend

# View logs
docker-compose logs -f [service]

# Stop all services
docker-compose down
```

### Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## Testing Strategy

### Frontend Testing
- **Unit**: Vitest for components and utilities
- **Integration**: React Testing Library for user interactions
- **E2E**: Playwright for full user workflows
- **Visual**: Storybook for component development

### Backend Testing
- **Unit**: Jest for business logic
- **Integration**: Supertest for API endpoints
- **Database**: Test database with migrations

### Python Testing
- **Unit**: pytest for scraping logic
- **Integration**: pytest-asyncio for FastAPI endpoints
- **Coverage**: pytest-cov for test coverage

## Common Issues & Solutions

### Python 3.13 Compatibility
Some packages have build issues with Python 3.13:
- **lxml**: Build errors with clang
- **selenium**: Greenlet dependency issues
- **celery**: Greenlet dependency issues
- **SQLAlchemy**: Build issues
- **psycopg2-binary**: Build issues

**Workaround**: Use newer compatible versions or alternative packages

### Port Conflicts
If ports 3000/3001 are in use:
- Frontend configured for port 3002
- Update `vite.config.ts`, `docker-compose.yml`, and `.env` files

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify Supabase configuration

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization with next/image
- Bundle analysis with webpack-bundle-analyzer
- Caching with React Query

### Backend
- Redis caching for API responses
- Database query optimization with Prisma
- Rate limiting for API endpoints
- Connection pooling

### Python Scraper
- Async/await for concurrent requests
- Request rate limiting to avoid blocking
- Redis for caching scraped data

## Security Best Practices

### Authentication
- JWT tokens with refresh mechanism
- Secure HTTP-only cookies
- Password hashing with bcrypt
- Rate limiting on auth endpoints

### API Security
- CORS configuration
- Helmet.js for security headers
- Input validation with Zod/Pydantic
- API key rotation

### Data Protection
- Environment variable validation
- Sensitive data encryption
- Audit logging
- GDPR compliance considerations

## Deployment

### Environment Setup
1. Set up production database (Supabase)
2. Configure Redis instance
3. Set up email service (Gmail API)
4. Configure OpenAI API access

### CI/CD Pipeline
- GitHub Actions for automated testing
- Docker image building
- Automated deployment to staging
- Production deployment with approval

### Monitoring
- Application performance monitoring
- Error tracking with Sentry
- Database performance monitoring
- API endpoint analytics

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Database read replicas
- Redis clustering
- Microservice separation

### Performance Monitoring
- Response time tracking
- Database query performance
- Memory usage monitoring
- Error rate tracking

## Contributing Guidelines

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Conventional commit messages
- Pre-commit hooks

### Pull Request Process
1. Create feature branch
2. Write tests for new features
3. Update documentation
4. Submit PR with description
5. Code review and approval

### Code Organization
- Feature-based folder structure
- Shared utilities in packages
- Clear separation of concerns
- Consistent naming conventions

## Troubleshooting

### Common Development Issues
1. **PNPM install fails**: Clear cache with `pnpm store prune`
2. **Port already in use**: Update port in configuration files
3. **Database connection**: Check PostgreSQL service and credentials
4. **Python packages fail**: Use virtual environment and compatible versions

### Debugging Tools
- Chrome DevTools for frontend
- Node.js debugger for backend
- FastAPI automatic docs for API testing
- Prisma Studio for database inspection

---

## Quick Reference

### Essential Commands
```bash
# Start development
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Database operations
cd apps/server && pnpm db:migrate
cd apps/server && pnpm db:generate

# Python environment
cd apps/scraper && source venv/bin/activate
```

### Important Files
- `package.json` - Root workspace configuration
- `turbo.json` - Build pipeline configuration
- `docker-compose.yml` - Development services
- `apps/server/prisma/schema.prisma` - Database schema
- `apps/frontend/vite.config.ts` - Frontend build config

### Key Directories
- `apps/` - Main applications
- `packages/` - Shared code
- `infrastructure/` - Docker and deployment
- `docs/` - Documentation
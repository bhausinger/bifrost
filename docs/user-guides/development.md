# Development Guide

This guide will help you set up and work with the Campaign Manager codebase.

## 🛠️ Prerequisites

### Required Software

- **Node.js** 18.19.0+ (use .nvmrc for exact version)
- **Python** 3.11+
- **Docker** & Docker Compose
- **pnpm** (preferred) or npm
- **Git**

### Recommended Tools

- **VS Code** with recommended extensions
- **PostgreSQL** client (optional, for direct DB access)
- **Postman** or **Insomnia** for API testing

## 🏗️ Architecture Overview

### Monorepo Structure

This project uses a monorepo architecture with the following apps and packages:

```
apps/
├── frontend/     # React + TypeScript frontend
├── server/       # Node.js + Express backend  
└── scraper/      # Python + FastAPI scraping service

packages/
├── shared-types/ # TypeScript type definitions
└── shared-utils/ # Shared utility functions
```

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- React Query for API state
- React Router for navigation

**Backend**
- Node.js + Express + TypeScript
- Prisma ORM with PostgreSQL
- Supabase for enhanced database features
- Redis for caching and sessions
- JWT for authentication

**Scraper Service**
- Python 3.11 + FastAPI
- BeautifulSoup + Selenium for scraping
- SQLAlchemy for database operations
- Celery for background tasks

## 🚀 Getting Started

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd campaign-manager

# Copy environment template
cp .env.example .env

# Install Node.js dependencies
pnpm install

# Install Python dependencies (for scraper)
cd apps/scraper
pip install -r requirements.txt
cd ../..
```

### 2. Configure Environment

Edit `.env` file with your configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/campaign_manager
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# APIs
OPENAI_API_KEY=sk-your-openai-key
```

### 3. Start Development Environment

**Option A: Using Docker (Recommended)**

```bash
./infrastructure/scripts/dev.sh
```

**Option B: Manual Setup**

```bash
# Start database services
docker-compose up postgres redis -d

# Start frontend (Terminal 1)
pnpm --filter @campaign-manager/frontend dev

# Start backend (Terminal 2)  
pnpm --filter @campaign-manager/server dev

# Start scraper (Terminal 3)
cd apps/scraper
python -m uvicorn src.main:app --reload --port 8000
```

## 🧩 Working with the Codebase

### Code Organization

**Frontend (`apps/frontend/`)**
```
src/
├── components/        # Reusable UI components
├── pages/            # Route components
├── hooks/            # Custom React hooks
├── stores/           # Zustand stores
├── services/         # API client functions
├── utils/            # Utility functions
└── types/            # TypeScript types
```

**Backend (`apps/server/`)**
```
src/
├── controllers/      # Route handlers
├── models/          # Database models
├── routes/          # Express routes
├── middleware/      # Express middleware
├── services/        # Business logic
└── utils/           # Utility functions
```

**Scraper (`apps/scraper/`)**
```
src/
├── api/             # FastAPI routes
├── services/        # Scraping business logic
├── models/          # Database models
├── core/            # Core utilities
└── config/          # Configuration
```

### Database Operations

**Running Migrations**
```bash
# Generate migration
pnpm --filter @campaign-manager/server prisma migrate dev --name migration-name

# Deploy migrations
pnpm --filter @campaign-manager/server prisma migrate deploy

# Reset database
pnpm --filter @campaign-manager/server prisma migrate reset
```

**Prisma Studio**
```bash
pnpm --filter @campaign-manager/server prisma studio
```

### Shared Packages

**Using Shared Types**
```typescript
import { Campaign, Artist } from '@campaign-manager/shared-types';
```

**Using Shared Utils**
```typescript
import { formatCurrency, validateEmail } from '@campaign-manager/shared-utils';
```

## 🧪 Testing

### Running Tests

```bash
# All tests
pnpm test

# Frontend tests only
pnpm --filter @campaign-manager/frontend test

# Backend tests only
pnpm --filter @campaign-manager/server test

# Watch mode
pnpm --filter @campaign-manager/frontend test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

**Frontend Tests**
- Unit tests with Vitest + React Testing Library
- E2E tests with Playwright
- Component testing with Storybook

**Backend Tests**
- Unit tests with Vitest
- Integration tests with Supertest
- Database tests with test database

### Writing Tests

**Frontend Component Test**
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

**Backend API Test**
```typescript
import request from 'supertest';
import { app } from '../index';

describe('GET /api/campaigns', () => {
  it('should return campaigns list', async () => {
    const response = await request(app)
      .get('/api/campaigns')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

## 🔧 Development Tools

### Code Quality

**ESLint & Prettier**
```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

**Type Checking**
```bash
# Check TypeScript types
pnpm type-check

# Watch mode
pnpm type-check:watch
```

### Debugging

**Frontend Debugging**
- Use React DevTools
- Zustand DevTools for state
- React Query DevTools for API state

**Backend Debugging**
- Use VS Code debugger with launch configuration
- Add breakpoints in TypeScript files
- Inspect with Chrome DevTools (node --inspect)

**Database Debugging**
- Use Prisma Studio for visual DB exploration
- Check query logs in development
- Use PostgreSQL logs for performance

## 📦 Package Management

### Adding Dependencies

**Frontend/Backend (Node.js)**
```bash
# Add to specific workspace
pnpm --filter @campaign-manager/frontend add package-name

# Add dev dependency
pnpm --filter @campaign-manager/frontend add -D package-name

# Add to root (affects all workspaces)
pnpm add -w package-name
```

**Scraper (Python)**
```bash
cd apps/scraper
pip install package-name
pip freeze > requirements.txt
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm --filter @campaign-manager/frontend update package-name

# Check outdated packages
pnpm outdated
```

## 🚀 Building & Deployment

### Development Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm --filter @campaign-manager/frontend build

# Build shared packages first
pnpm --filter "@campaign-manager/shared-*" build
```

### Production Build

```bash
# Build production Docker images
docker-compose -f docker-compose.yml build

# Deploy to production
./infrastructure/scripts/deploy.sh production
```

## 🐛 Common Issues

### Port Conflicts
If ports are already in use:
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules
pnpm install

# Clean Turbo cache
pnpm clean
```

## 📝 Best Practices

### Code Style

1. **Use TypeScript strictly** - avoid `any` type
2. **Follow naming conventions** - camelCase for variables, PascalCase for components
3. **Write self-documenting code** - clear variable and function names
4. **Add JSDoc comments** for complex functions
5. **Use absolute imports** with path aliases

### Git Workflow

1. **Branch naming**: `feature/description`, `fix/description`, `chore/description`
2. **Commit messages**: Use conventional commits format
3. **Pull requests**: Include description, testing notes, and screenshots
4. **Code review**: Required before merging to main

### Performance

1. **Frontend**: Use React.memo, useMemo, useCallback appropriately
2. **Backend**: Implement proper caching strategies
3. **Database**: Use indexes, avoid N+1 queries
4. **Scraping**: Implement rate limiting and respectful delays

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
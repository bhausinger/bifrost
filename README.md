# Campaign Manager

A comprehensive music promotion campaign management platform designed to help you discover artists, manage outreach campaigns, and track performance metrics across multiple platforms.

## 🎯 Features

- **Campaign Management**: Create and manage promotion campaigns with detailed tracking
- **Artist Discovery**: AI-powered artist discovery and recommendation system
- **SoundCloud Scraping**: Extract artist data and track metrics from SoundCloud
- **Email Outreach**: Automated email campaigns with templates and tracking
- **Analytics Dashboard**: Comprehensive analytics and reporting
- **Financial Tracking**: P&L tracking, expense management, and revenue analysis

## 🏗️ Architecture

This is a monorepo built with modern technologies:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Scraper**: Python + FastAPI + BeautifulSoup + Selenium
- **Database**: PostgreSQL + Supabase
- **Cache**: Redis
- **Infrastructure**: Docker + Nginx

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campaign-manager
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development environment**
   ```bash
   chmod +x infrastructure/scripts/dev.sh
   ./infrastructure/scripts/dev.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Scraper API: http://localhost:8000
   - Full App (via Nginx): http://localhost

### Manual Development Setup

If you prefer to run services individually:

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start database services**
   ```bash
   docker-compose up postgres redis -d
   ```

3. **Start all services**
   ```bash
   # Terminal 1: Frontend
   pnpm --filter @campaign-manager/frontend dev

   # Terminal 2: Backend
   pnpm --filter @campaign-manager/server dev

   # Terminal 3: Scraper (requires Python)
   cd apps/scraper
   pip install -r requirements.txt
   python -m uvicorn src.main:app --reload --port 8000
   ```

## 📁 Project Structure

```
campaign-manager/
├── apps/
│   ├── frontend/          # React frontend application
│   ├── server/            # Node.js backend API
│   └── scraper/           # Python scraping service
├── packages/
│   ├── shared-types/      # Shared TypeScript types
│   └── shared-utils/      # Shared utility functions
├── infrastructure/
│   ├── docker/            # Docker configurations
│   ├── nginx/             # Nginx configurations
│   ├── database/          # Database initialization
│   └── scripts/           # Deployment scripts
├── docs/                  # Documentation
└── docker-compose.yml     # Development environment
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- **Database**: PostgreSQL and Supabase credentials
- **Authentication**: JWT secrets
- **APIs**: OpenAI, Gmail, Spotify keys
- **Email**: SMTP configuration for outreach

### Database Setup

The application uses PostgreSQL with Supabase for enhanced features:

1. Create a Supabase project
2. Copy your project URL and keys to `.env`
3. Run migrations: `pnpm --filter @campaign-manager/server prisma migrate dev`

## 📖 Documentation

- [Development Guide](docs/development.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Architecture Overview](docs/architecture.md)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Frontend tests
pnpm --filter @campaign-manager/frontend test

# Backend tests
pnpm --filter @campaign-manager/server test

# E2E tests
pnpm test:e2e
```

## 🚀 Deployment

### Production Deployment

1. **Set up production environment**
   ```bash
   export DOCKER_REGISTRY=your-registry.com
   export SUPABASE_URL=your-production-supabase-url
   # ... other production variables
   ```

2. **Deploy**
   ```bash
   ./infrastructure/scripts/deploy.sh production latest
   ```

### Docker Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Discussions](discussions/)

## 🔗 Related Projects

- [Artist Influence](https://artistinfluence.com) - Inspiration for this project
- [SoundCloud API](https://developers.soundcloud.com/)
- [Supabase](https://supabase.com/)

---

Built with ❤️ for the music promotion community.
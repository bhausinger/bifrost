#!/bin/bash

# Production deployment script for Campaign Manager
set -e

# Configuration
DEPLOY_ENV=${1:-production}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
IMAGE_TAG=${2:-latest}

echo "🚀 Deploying Campaign Manager to $DEPLOY_ENV environment..."
echo "📦 Using image tag: $IMAGE_TAG"

# Check required environment variables
required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Build production images
echo "🔧 Building production images..."

# Build and tag frontend
docker build -f infrastructure/docker/frontend/Dockerfile --target production -t $DOCKER_REGISTRY/campaign-manager-frontend:$IMAGE_TAG .

# Build and tag server
docker build -f infrastructure/docker/server/Dockerfile --target production -t $DOCKER_REGISTRY/campaign-manager-server:$IMAGE_TAG .

# Build and tag scraper
docker build -f infrastructure/docker/scraper/Dockerfile --target production -t $DOCKER_REGISTRY/campaign-manager-scraper:$IMAGE_TAG .

# Push images to registry (if registry is configured)
if [ "$DOCKER_REGISTRY" != "your-registry.com" ]; then
    echo "📤 Pushing images to registry..."
    docker push $DOCKER_REGISTRY/campaign-manager-frontend:$IMAGE_TAG
    docker push $DOCKER_REGISTRY/campaign-manager-server:$IMAGE_TAG
    docker push $DOCKER_REGISTRY/campaign-manager-scraper:$IMAGE_TAG
fi

# Deploy using docker-compose
echo "🚀 Deploying services..."

# Create production docker-compose override
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  frontend:
    image: $DOCKER_REGISTRY/campaign-manager-frontend:$IMAGE_TAG
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes: []

  server:
    image: $DOCKER_REGISTRY/campaign-manager-server:$IMAGE_TAG
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - SUPABASE_URL=\${SUPABASE_URL}
      - SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=\${JWT_SECRET}
      - JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
    volumes: []

  scraper:
    image: $DOCKER_REGISTRY/campaign-manager-scraper:$IMAGE_TAG
    restart: unless-stopped
    environment:
      - DEBUG=false
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    volumes:
      - ./logs:/app/logs

  postgres:
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    restart: unless-stopped
EOF

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Start production services
echo "▶️  Starting production services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Health checks
echo "🏥 Performing health checks..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost/health > /dev/null; then
        echo "✅ Application is healthy!"
        break
    fi
    
    echo "⏳ Waiting for application to be ready... (attempt $((attempt + 1))/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Application failed to start properly"
    echo "🔍 Checking logs..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=20
    exit 1
fi

# Run database migrations
echo "🗃️  Running database migrations..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec server pnpm prisma migrate deploy

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo ""
echo "🔧 Management commands:"
echo "   View logs:     docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f [service]"
echo "   Stop all:      docker-compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo "   Update:        ./infrastructure/scripts/deploy.sh $DEPLOY_ENV [new-tag]"
echo ""
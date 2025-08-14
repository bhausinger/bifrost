#!/bin/bash

# Development script for Campaign Manager
set -e

echo "🚀 Starting Campaign Manager in development mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please update .env file with your configuration"
fi

# Build and start services
echo "🔧 Building and starting services..."
docker-compose -f docker-compose.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running at http://localhost:3000"
else
    echo "❌ Frontend is not responding"
fi

# Check backend
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Backend is running at http://localhost:5000"
else
    echo "❌ Backend is not responding"
fi

# Check scraper
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Scraper is running at http://localhost:8000"
else
    echo "❌ Scraper is not responding"
fi

# Check database
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null; then
    echo "✅ Database is running"
else
    echo "❌ Database is not responding"
fi

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:  http://localhost:3002"
echo "   Backend:   http://localhost:5000"
echo "   Scraper:   http://localhost:8000"
echo "   Nginx:     http://localhost:80"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker-compose logs -f [service]"
echo "   Stop all:      docker-compose down"
echo "   Restart:       docker-compose restart [service]"
echo "   Shell access:  docker-compose exec [service] /bin/bash"
echo ""
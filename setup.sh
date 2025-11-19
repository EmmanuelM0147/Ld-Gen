#!/bin/bash

echo "🚀 Lead Generation Platform Setup"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leadgen
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Puppeteer Configuration
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Environment
NODE_ENV=development
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p nginx/ssl

echo "✅ Directories created"

# Check if PostgreSQL is running locally
if pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "✅ PostgreSQL is running locally"
    echo "📊 You can run the database migration manually:"
    echo "   psql -U postgres -d leadgen -f backend/migrations/003_enhanced_lead_system.sql"
else
    echo "⚠️  PostgreSQL is not running locally"
    echo "   The Docker setup will use the containerized PostgreSQL"
fi

echo ""
echo "🚀 Starting the platform with Docker..."
echo "   This may take a few minutes on first run..."

# Start the platform
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check backend
if curl -f http://localhost:5001/api/health &> /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 &> /dev/null; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

# Check database
if docker exec leadgen_postgres pg_isready -U postgres &> /dev/null; then
    echo "✅ Database is healthy"
else
    echo "❌ Database health check failed"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Access your platform:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5001"
echo "   Database: localhost:5432"
echo ""
echo "📚 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Navigate to 'Lead Prospecting' in the sidebar"
echo "   3. Click 'Start Prospecting' to test the system"
echo "   4. Enter search criteria like 'software companies' + 'United States'"
echo ""
echo "🛠️  Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Update: docker-compose pull && docker-compose up -d"
echo ""
echo "📖 For more information, check the README.md file"
echo ""
echo "⚠️  Important: This platform is for legitimate business prospecting only."
echo "   Please use responsibly and comply with all applicable laws and website terms."

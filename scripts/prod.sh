#!/bin/bash
# ===========================================
# ClassBland Production Script (Linux/Mac)
# ===========================================

set -e

echo "🚀 Starting ClassBland in production mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose up -d --build

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations inside container
echo "🗄️ Running database migrations..."
docker compose exec app npx prisma migrate deploy

# Seed database (optional, will fail if already seeded)
echo "🌱 Seeding database..."
docker compose exec app npx prisma db seed || echo "⚠️ Seed may have already run"

echo ""
echo "✅ ClassBland is running!"
echo "📍 Local URL: http://localhost:3000"
echo ""
echo "To expose via Cloudflare Tunnel, run:"
echo "  ./scripts/start_tunnel.sh"

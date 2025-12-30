#!/bin/bash
# ===========================================
# ClassBland Development Script (Linux/Mac)
# ===========================================

set -e

echo "🚀 Starting ClassBland in development mode..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your settings."
fi

# Start PostgreSQL with Docker if not running
if ! docker ps | grep -q classbland-db; then
    echo "🐘 Starting PostgreSQL..."
    docker compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Seed database
echo "🌱 Seeding database..."
npm run db:seed || echo "⚠️ Seed may have already run"

# Start dev server
echo "🎉 Starting development server..."
npm run dev

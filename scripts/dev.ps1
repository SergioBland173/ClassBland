# ===========================================
# ClassBland Development Script (Windows)
# ===========================================

Write-Host "🚀 Starting ClassBland in development mode..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "📋 Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env created. Please edit it with your settings." -ForegroundColor Green
}

# Start PostgreSQL with Docker if not running
$dbContainer = docker ps --filter "name=classbland-db" --format "{{.Names}}"
if (-not $dbContainer) {
    Write-Host "🐘 Starting PostgreSQL..." -ForegroundColor Yellow
    docker compose up -d postgres
    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate

# Run migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
npm run db:push

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
try {
    npm run db:seed
} catch {
    Write-Host "⚠️ Seed may have already run" -ForegroundColor Yellow
}

# Start dev server
Write-Host "🎉 Starting development server..." -ForegroundColor Green
npm run dev

# ===========================================
# ClassBland Production Script (Windows)
# ===========================================

Write-Host "🚀 Starting ClassBland in production mode..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure it." -ForegroundColor Yellow
    exit 1
}

# Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
docker compose up -d --build

# Wait for database
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run migrations inside container
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
docker compose exec app npx prisma migrate deploy

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
try {
    docker compose exec app npx prisma db seed
} catch {
    Write-Host "⚠️ Seed may have already run" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ ClassBland is running!" -ForegroundColor Green
Write-Host "📍 Local URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To expose via Cloudflare Tunnel, run:" -ForegroundColor Yellow
Write-Host "  .\scripts\start_tunnel.ps1" -ForegroundColor White

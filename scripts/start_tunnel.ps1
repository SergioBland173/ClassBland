# ===========================================
# Cloudflare Quick Tunnel Script (Windows)
# ===========================================

Write-Host "🌐 Starting Cloudflare Quick Tunnel..." -ForegroundColor Cyan

# Check if cloudflared is installed
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "❌ cloudflared is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Install instructions:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Winget:" -ForegroundColor Cyan
    Write-Host "  winget install Cloudflare.cloudflared" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Manual download:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor White
    Write-Host "  2. Download cloudflared-windows-amd64.exe" -ForegroundColor White
    Write-Host "  3. Rename to cloudflared.exe and add to PATH" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if localhost:3000 is responding
Write-Host "🔍 Checking if app is running on http://localhost:3000..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
} catch {
    Write-Host "❌ App is not responding on http://localhost:3000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the app first:" -ForegroundColor Yellow
    Write-Host "  Development: .\scripts\dev.ps1" -ForegroundColor White
    Write-Host "  Production:  .\scripts\prod.ps1" -ForegroundColor White
    exit 1
}

Write-Host "✅ App is running!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting tunnel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  SHARE THE URL BELOW WITH YOUR STUDENTS!" -ForegroundColor Magenta
Write-Host "  (It will appear after the tunnel starts)" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

# Start the tunnel
cloudflared tunnel --url http://localhost:3000

# Note: The script will keep running while the tunnel is active
# Press Ctrl+C to stop

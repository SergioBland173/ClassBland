#!/bin/bash
# ===========================================
# Cloudflare Quick Tunnel Script (Linux/Mac)
# ===========================================

set -e

echo "🌐 Starting Cloudflare Quick Tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed!"
    echo ""
    echo "📥 Install instructions:"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb"
    echo "  sudo dpkg -i cloudflared.deb"
    echo ""
    echo "Mac (Homebrew):"
    echo "  brew install cloudflared"
    echo ""
    exit 1
fi

# Check if localhost:3000 is responding
echo "🔍 Checking if app is running on http://localhost:3000..."
if ! curl -s --head http://localhost:3000 > /dev/null; then
    echo "❌ App is not responding on http://localhost:3000"
    echo ""
    echo "Please start the app first:"
    echo "  Development: ./scripts/dev.sh"
    echo "  Production:  ./scripts/prod.sh"
    exit 1
fi

echo "✅ App is running!"
echo ""
echo "🚀 Starting tunnel..."
echo ""
echo "================================================"
echo "  SHARE THE URL BELOW WITH YOUR STUDENTS!"
echo "  (It will appear after the tunnel starts)"
echo "================================================"
echo ""

# Start the tunnel
cloudflared tunnel --url http://localhost:3000

# Note: The script will keep running while the tunnel is active
# Press Ctrl+C to stop

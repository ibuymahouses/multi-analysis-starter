#!/bin/bash

echo "🔍 DEBUGGING DATA LOADING ON EC2"
echo "================================"

# Check if we're in the right directory
echo "📁 Current directory: $(pwd)"
echo "📁 Contents:"
ls -la

# Check if data files exist
echo ""
echo "📊 CHECKING DATA FILES:"
echo "================================"
if [ -d "data" ]; then
    echo "✅ Root data directory exists"
    echo "📁 Root data contents:"
    ls -la data/
else
    echo "❌ Root data directory missing"
fi

if [ -d "packages/api/data" ]; then
    echo "✅ API data directory exists"
    echo "📁 API data contents:"
    ls -la packages/api/data/
else
    echo "❌ API data directory missing"
fi

# Check if API is running
echo ""
echo "🔌 CHECKING API STATUS:"
echo "================================"
echo "Processes on port 3001:"
netstat -tlnp 2>/dev/null | grep ":3001" || echo "No processes on port 3001"

echo ""
echo "PM2 processes:"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 not available"
fi

# Test API endpoints
echo ""
echo "🧪 TESTING API ENDPOINTS:"
echo "================================"
echo "Testing API health..."
curl -s http://localhost:3001/health 2>/dev/null || echo "❌ API health check failed"

echo ""
echo "Testing listings endpoint..."
curl -s http://localhost:3001/listings 2>/dev/null | head -c 200 || echo "❌ Listings endpoint failed"

echo ""
echo "Testing rents endpoint..."
curl -s http://localhost:3001/rents 2>/dev/null | head -c 200 || echo "❌ Rents endpoint failed"

# Check API logs
echo ""
echo "📋 API LOGS (last 20 lines):"
echo "================================"
if command -v pm2 &> /dev/null; then
    pm2 logs api --lines 20 --nostream 2>/dev/null || echo "No PM2 logs available"
else
    echo "PM2 not available for logs"
fi

# Check environment variables
echo ""
echo "🔧 ENVIRONMENT CHECK:"
echo "================================"
echo "NODE_ENV: $NODE_ENV"
echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "Current working directory: $(pwd)"

# Check if API can read data files
echo ""
echo "📖 API DATA FILE ACCESS:"
echo "================================"
if [ -f "packages/api/dist/index.js" ]; then
    echo "✅ API built successfully"
    echo "📁 API dist contents:"
    ls -la packages/api/dist/
else
    echo "❌ API not built"
fi

echo ""
echo "🔍 DEBUGGING COMPLETE"

#!/bin/bash

echo "🔍 Checking for version mismatches between local and EC2 environments..."
echo ""

# Check local versions
echo "📋 LOCAL ENVIRONMENT VERSIONS:"
echo "================================"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

echo "📦 LOCAL PACKAGE VERSIONS:"
echo "================================"
cd packages/web
echo "Next.js: $(npm list next --depth=0 | grep next)"
echo "React: $(npm list react --depth=0 | grep react)"
echo "TypeScript: $(npm list typescript --depth=0 | grep typescript)"
echo ""

# Check if we can connect to EC2 and get versions
echo "🖥️  EC2 ENVIRONMENT VERSIONS:"
echo "================================"
echo "Attempting to check EC2 versions..."
echo ""

# This script will be run on EC2 to check versions
cat > /tmp/check-ec2-versions.sh << 'EOF'
#!/bin/bash
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""
echo "📦 EC2 PACKAGE VERSIONS:"
echo "================================"
cd ~/app/multi-analysis-starter/packages/web 2>/dev/null || {
    echo "❌ Web package not found on EC2"
    exit 1
}
echo "Next.js: $(npm list next --depth=0 | grep next)"
echo "React: $(npm list react --depth=0 | grep react)"
echo "TypeScript: $(npm list typescript --depth=0 | grep typescript)"
echo ""
echo "🔧 EC2 BUILD TEST:"
echo "================================"
cd ~/app/multi-analysis-starter/packages/web
echo "Running type check..."
npm run type-check 2>&1 | head -20
echo ""
echo "Running build test..."
npm run build 2>&1 | head -30
EOF

echo "📝 Created EC2 version check script at /tmp/check-ec2-versions.sh"
echo ""
echo "🚀 To run this on EC2, SSH into your instance and run:"
echo "   bash /tmp/check-ec2-versions.sh"
echo ""
echo "💡 Or you can run it via the debug script:"
echo "   bash scripts/deploy-ec2-debug.sh"
echo ""
echo "🔍 MANUAL COMPARISON:"
echo "================================"
echo "Compare the versions above with what you see on EC2."
echo "Key things to check:"
echo "1. Node.js version (should be 18.x)"
echo "2. npm version (should be 8.x or higher)"
echo "3. Next.js version (should be 14.2.31)"
echo "4. TypeScript version (should be 5.9.2)"
echo "5. React version (should be 18.2.0)"
echo ""
echo "⚠️  If versions differ, that could explain the build failures!"

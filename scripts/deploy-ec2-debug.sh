#!/bin/bash

# Debug deployment script for EC2
# This script helps identify and fix common deployment issues

set -e

echo "🔍 EC2 Deployment Debug Script"
echo "================================"

# Check system information
echo "📋 System Information:"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo ""

# Check Node.js installation
echo "🔍 Node.js Environment:"
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Node.js location: $(which node)"
    echo "npm location: $(which npm)"
else
    echo "❌ Node.js is not installed"
    echo "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
fi
echo ""

# Check available disk space
echo "💾 Disk Space:"
df -h
echo ""

# Check available memory
echo "🧠 Memory:"
free -h
echo ""

# Setup swap space if needed
echo "💾 Setting up swap space for memory management..."
if ! swapon --show | grep -q "/swapfile"; then
    echo "Creating swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
echo "Swap space: $(free -h | grep Swap)"
echo ""

# Set Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=4096"
echo "🔧 Set NODE_OPTIONS: $NODE_OPTIONS"
echo ""

# Navigate to app directory
echo "📁 Navigating to app directory..."
cd ~/app
echo "Current directory: $(pwd)"
echo ""

# Check if repository exists
if [ -d "multi-analysis-starter" ]; then
    echo "📁 Repository found"
    cd multi-analysis-starter
    echo "Repository directory: $(pwd)"
    echo "Git status:"
    git status --porcelain || echo "Git status failed"
    echo "Current branch: $(git branch --show-current)"
    echo ""
else
    echo "❌ Repository not found"
    echo "Please clone the repository first"
    exit 1
fi

# Check package.json files
echo "📦 Package.json files:"
echo "Root package.json exists: $([ -f "package.json" ] && echo "✅" || echo "❌")"
echo "API package.json exists: $([ -f "packages/api/package.json" ] && echo "✅" || echo "❌")"
echo "Web package.json exists: $([ -f "packages/web/package.json" ] && echo "✅" || echo "❌")"
echo "Shared package.json exists: $([ -f "packages/shared/package.json" ] && echo "✅" || echo "❌")"
echo ""

# Check TypeScript configuration
echo "🔧 TypeScript Configuration:"
echo "API tsconfig.json exists: $([ -f "packages/api/tsconfig.json" ] && echo "✅" || echo "❌")"
echo "Web tsconfig.json exists: $([ -f "packages/web/tsconfig.json" ] && echo "✅" || echo "❌")"
echo "Shared tsconfig.json exists: $([ -f "packages/shared/tsconfig.json" ] && echo "✅" || echo "❌")"
echo ""

# Check package versions
echo "📦 Package Versions:"
echo "================================"
if [ -d "packages/web" ]; then
    cd packages/web
    echo "Next.js: $(npm list next --depth=0 2>/dev/null | grep next || echo "Not installed")"
    echo "React: $(npm list react --depth=0 2>/dev/null | grep react || echo "Not installed")"
    echo "TypeScript: $(npm list typescript --depth=0 2>/dev/null | grep typescript || echo "Not installed")"
    cd ../..
else
    echo "❌ Web package not found"
fi
echo ""

# Check source files
echo "📄 Source Files:"
echo "API src directory: $([ -d "packages/api/src" ] && echo "✅" || echo "❌")"
echo "Web src directory: $([ -d "packages/web/src" ] && echo "✅" || echo "❌")"
echo "Shared src directory: $([ -d "packages/shared/src" ] && echo "✅" || echo "❌")"
echo ""

# Clean installation
echo "🧹 Cleaning previous installation..."
rm -rf node_modules || echo "No root node_modules to remove"
rm -rf packages/*/node_modules || echo "No package node_modules to remove"
npm cache clean --force || echo "npm cache clean failed"
echo ""

# Install dependencies step by step
echo "📦 Installing dependencies..."

echo "1. Installing root dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Root dependencies installed successfully"
else
    echo "❌ Root dependencies failed"
    exit 1
fi

echo "2. Installing shared package dependencies..."
npm install --prefix packages/shared
if [ $? -eq 0 ]; then
    echo "✅ Shared package dependencies installed successfully"
else
    echo "❌ Shared package dependencies failed"
    exit 1
fi

echo "3. Installing API package dependencies..."
npm install --prefix packages/api
if [ $? -eq 0 ]; then
    echo "✅ API package dependencies installed successfully"
else
    echo "❌ API package dependencies failed"
    exit 1
fi

echo "4. Installing web package dependencies (with memory optimization)..."
cd packages/web
npm install --no-optional --production=false || {
    echo "❌ Failed to install web package dependencies"
    echo "Trying with reduced memory usage..."
    npm install --no-optional --production=false --maxsockets=1 || {
        echo "❌ Web package installation failed even with reduced memory"
        exit 1
    }
}
cd ../..
if [ $? -eq 0 ]; then
    echo "✅ Web package dependencies installed successfully"
else
    echo "❌ Web package dependencies failed"
    exit 1
fi

echo "5. Installing worker package dependencies..."
npm install --prefix packages/worker
if [ $? -eq 0 ]; then
    echo "✅ Worker package dependencies installed successfully"
else
    echo "❌ Worker package dependencies failed"
    exit 1
fi

echo ""

# Build step by step
echo "🔨 Building application..."

echo "1. Building shared package..."
npm run build --prefix packages/shared
if [ $? -eq 0 ]; then
    echo "✅ Shared package built successfully"
else
    echo "❌ Shared package build failed"
    exit 1
fi

echo "2. Building API package..."
npm run build --prefix packages/api
if [ $? -eq 0 ]; then
    echo "✅ API package built successfully"
else
    echo "❌ API package build failed"
    exit 1
fi

echo "3. Building web package..."
npm run build --prefix packages/web
if [ $? -eq 0 ]; then
    echo "✅ Web package built successfully"
else
    echo "❌ Web package build failed"
    exit 1
fi

echo ""

# Check build outputs
echo "📁 Build Outputs:"
echo "API dist directory: $([ -d "packages/api/dist" ] && echo "✅" || echo "❌")"
echo "Shared dist directory: $([ -d "packages/shared/dist" ] && echo "✅" || echo "❌")"
echo "Web .next directory: $([ -d "packages/web/.next" ] && echo "✅" || echo "❌")"
echo ""

# Check for process managers
echo "🔧 Process Managers:"
command -v docker-compose && echo "✅ Docker Compose available" || echo "❌ Docker Compose not available"
command -v pm2 && echo "✅ PM2 available" || echo "❌ PM2 not available"
systemctl list-units --type=service | grep multi-analysis && echo "✅ systemd service available" || echo "❌ systemd service not available"
echo ""

echo "🎉 Debug script completed successfully!"
echo "If all steps passed, your deployment should work correctly."

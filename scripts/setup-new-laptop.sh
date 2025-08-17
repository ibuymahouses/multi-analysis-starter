#!/bin/bash

# Multi-Analysis Development Environment Setup Script
# Run this when starting work on a new laptop

set -e  # Exit on any error

echo "🚀 Setting up Multi-Analysis development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ -f "package.json" ] && [ -d "packages" ]; then
    print_status "Already in multi-analysis-starter directory"
else
    print_status "Cloning repository..."
    git clone https://github.com/your-username/multi-analysis-starter.git
    cd multi-analysis-starter
fi

# Check if we have the latest changes
print_status "Pulling latest changes from GitHub..."
git pull origin main

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    print_warning "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. You'll need it for local database setup."
    print_warning "Visit: https://docs.docker.com/get-docker/"
else
    if ! docker info &> /dev/null; then
        print_warning "Docker is installed but not running. Start Docker Desktop."
    else
        print_success "Docker is running"
    fi
fi

# Install dependencies
print_status "Installing dependencies for all packages..."
npm run install:all

# Build packages
print_status "Building all packages..."
npm run build

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration"
    else
        print_warning "No .env.example found. You'll need to create .env manually"
    fi
fi

# Start local database (if Docker is available)
if command -v docker &> /dev/null && docker info &> /dev/null; then
    print_status "Starting local database services..."
    docker-compose up -d db redis
    print_success "Database services started"
else
    print_warning "Skipping database startup (Docker not available)"
fi

print_success "Setup complete! 🎉"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run dev' to start development servers"
echo "3. Run 'npm run db:migrate' to set up database schema"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start all development servers"
echo "  npm run dev:api      - Start API server only"
echo "  npm run dev:web      - Start web server only"
echo "  npm run build        - Build all packages"
echo "  npm run test         - Run tests"
echo "  npm run db:migrate   - Run database migrations"
echo ""
print_success "You're ready to code! 💻"

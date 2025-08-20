#!/bin/bash

# Cleanup script to remove Vercel and Railway configurations
# This helps focus on AWS-only deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_status "Cleaning up Vercel and Railway configurations..."

# Remove Vercel configuration files
if [ -f "vercel.json" ]; then
    rm vercel.json
    print_success "Removed vercel.json"
fi

if [ -d ".vercel" ]; then
    rm -rf .vercel
    print_success "Removed .vercel directory"
fi

# Remove Railway configuration files
if [ -f "railway.json" ]; then
    rm railway.json
    print_success "Removed railway.json"
fi

if [ -f "railway.toml" ]; then
    rm railway.toml
    print_success "Removed railway.toml"
fi

# Remove any platform-specific environment files
if [ -f ".env.vercel" ]; then
    rm .env.vercel
    print_success "Removed .env.vercel"
fi

if [ -f ".env.railway" ]; then
    rm .env.railway
    print_success "Removed .env.railway"
fi

# Update package.json to remove Vercel/Railway scripts
print_status "Updating package.json..."

# Check if deploy:vercel exists and remove it
if grep -q '"deploy:vercel"' package.json; then
    # This is a simple approach - in a real scenario you might want to use jq
    print_warning "Found deploy:vercel script in package.json"
    print_warning "Please manually remove it and keep only deploy:aws"
fi

# Remove any Vercel/Railway dependencies
print_status "Checking for platform-specific dependencies..."

# Check for Vercel CLI
if npm list -g vercel >/dev/null 2>&1; then
    print_warning "Vercel CLI is installed globally"
    print_warning "You can uninstall it with: npm uninstall -g vercel"
fi

# Check for Railway CLI
if npm list -g @railway/cli >/dev/null 2>&1; then
    print_warning "Railway CLI is installed globally"
    print_warning "You can uninstall it with: npm uninstall -g @railway/cli"
fi

# Clean up any platform-specific git remotes
print_status "Checking git remotes..."

if git remote get-url vercel >/dev/null 2>&1; then
    git remote remove vercel
    print_success "Removed Vercel git remote"
fi

if git remote get-url railway >/dev/null 2>&1; then
    git remote remove railway
    print_success "Removed Railway git remote"
fi

# Show current git remotes
print_status "Current git remotes:"
git remote -v

# Create AWS-focused environment setup
print_status "Setting up AWS-focused environment..."

# Create local environment if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local for local development..."
    cat > .env.local << 'EOF'
# =============================================================================
# LOCAL DEVELOPMENT ENVIRONMENT (AWS-Focused)
# =============================================================================
NODE_ENV=development

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGINS=http://localhost:3000

# Database Configuration (Local PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration (Local Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# AWS Configuration (for future use)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

# Worker Configuration
WORKER_PORT=3002

# Logging Configuration
LOG_LEVEL=debug
EOF
    print_success "Created .env.local"
fi

# Create production environment template
if [ ! -f ".env.production" ]; then
    print_status "Creating .env.production template for AWS deployment..."
    cat > .env.production << 'EOF'
# =============================================================================
# PRODUCTION ENVIRONMENT (AWS Deployment)
# =============================================================================
NODE_ENV=production

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=https://your-ec2-public-ip:3001

# CORS Configuration
CORS_ORIGINS=https://your-ec2-public-ip:3000

# Database Configuration (AWS RDS)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis_production
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Redis Configuration (AWS ElastiCache)
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-s3-bucket-name

# Worker Configuration
WORKER_PORT=3002

# Logging Configuration
LOG_LEVEL=warn
EOF
    print_success "Created .env.production template"
fi

# Copy local environment to active .env
cp .env.local .env
print_success "Set .env.local as active environment"

print_success "Cleanup completed!"
print_status ""
print_status "Next steps:"
print_status "1. Review and update your .env.production with actual AWS values"
print_status "2. Run: bash scripts/aws-infrastructure.sh"
print_status "3. Deploy with: npm run deploy:aws"
print_status ""
print_status "Your application is now configured for AWS-only deployment!"

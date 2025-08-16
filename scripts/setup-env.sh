#!/bin/bash

# Environment Setup Script
# This script helps set up environment variables for different deployment scenarios

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

# Function to create environment file
create_env_file() {
    local env_type=$1
    local env_file=".env.${env_type}"
    
    print_status "Creating ${env_file} for ${env_type} environment..."
    
    case $env_type in
        "local")
            cat > "$env_file" << 'EOF'
# =============================================================================
# LOCAL DEVELOPMENT ENVIRONMENT
# =============================================================================
NODE_ENV=development

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGINS=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# AWS Configuration (not needed for local development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

# Worker Configuration
WORKER_PORT=3002

# Logging Configuration
LOG_LEVEL=debug
EOF
            ;;
        "staging")
            cat > "$env_file" << 'EOF'
# =============================================================================
# STAGING ENVIRONMENT
# =============================================================================
NODE_ENV=staging

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=https://your-staging-api-domain.com

# CORS Configuration
CORS_ORIGINS=https://your-staging-frontend-domain.com

# Database Configuration
DB_HOST=your-staging-db-host
DB_PORT=5432
DB_NAME=multi_analysis_staging
DB_USER=your_staging_user
DB_PASSWORD=your_staging_password

# Redis Configuration
REDIS_HOST=your-staging-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_staging_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-staging-jwt-secret-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_staging_access_key
AWS_SECRET_ACCESS_KEY=your_staging_secret_key
S3_BUCKET=your-staging-bucket

# Worker Configuration
WORKER_PORT=3002

# Logging Configuration
LOG_LEVEL=info
EOF
            ;;
        "production")
            cat > "$env_file" << 'EOF'
# =============================================================================
# PRODUCTION ENVIRONMENT
# =============================================================================
NODE_ENV=production

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=https://your-production-api-domain.com

# CORS Configuration
CORS_ORIGINS=https://your-production-frontend-domain.com

# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=multi_analysis_production
DB_USER=your_production_user
DB_PASSWORD=your_production_password

# Redis Configuration
REDIS_HOST=your-production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_production_access_key
AWS_SECRET_ACCESS_KEY=your_production_secret_key
S3_BUCKET=your-production-bucket

# Worker Configuration
WORKER_PORT=3002

# Logging Configuration
LOG_LEVEL=warn
EOF
            ;;
        *)
            print_error "Unknown environment type: $env_type"
            exit 1
            ;;
    esac
    
    print_success "Created ${env_file}"
}

# Function to copy environment file
copy_env_file() {
    local env_type=$1
    
    if [ -f ".env.${env_type}" ]; then
        cp ".env.${env_type}" ".env"
        print_success "Copied .env.${env_type} to .env"
    else
        print_error ".env.${env_type} not found. Run './scripts/setup-env.sh create ${env_type}' first."
        exit 1
    fi
}

# Function to validate environment file
validate_env_file() {
    local env_file=$1
    
    if [ ! -f "$env_file" ]; then
        print_error "Environment file $env_file not found"
        return 1
    fi
    
    print_status "Validating $env_file..."
    
    # Check for required variables
    local required_vars=("NODE_ENV" "PORT" "NEXT_PUBLIC_API_URL" "CORS_ORIGINS")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Missing required variables in $env_file:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    fi
    
    print_success "$env_file is valid"
    return 0
}

# Function to show current environment
show_current_env() {
    if [ -f ".env" ]; then
        print_status "Current .env file contents:"
        echo "=================================="
        cat .env
        echo "=================================="
    else
        print_warning "No .env file found"
    fi
}

# Main script logic
case "${1:-help}" in
    "create")
        if [ -z "$2" ]; then
            print_error "Please specify environment type: local, staging, or production"
            exit 1
        fi
        create_env_file "$2"
        ;;
    "use")
        if [ -z "$2" ]; then
            print_error "Please specify environment type: local, staging, or production"
            exit 1
        fi
        copy_env_file "$2"
        ;;
    "validate")
        validate_env_file ".env"
        ;;
    "show")
        show_current_env
        ;;
    "help"|*)
        echo "Environment Setup Script"
        echo "========================"
        echo ""
        echo "Usage: $0 <command> [environment]"
        echo ""
        echo "Commands:"
        echo "  create <env>    Create environment file (.env.local, .env.staging, .env.production)"
        echo "  use <env>       Copy environment file to .env"
        echo "  validate        Validate current .env file"
        echo "  show            Show current .env file contents"
        echo "  help            Show this help message"
        echo ""
        echo "Environments:"
        echo "  local           Local development environment"
        echo "  staging         Staging environment"
        echo "  production      Production environment"
        echo ""
        echo "Examples:"
        echo "  $0 create local"
        echo "  $0 use local"
        echo "  $0 validate"
        ;;
esac

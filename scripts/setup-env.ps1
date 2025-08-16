# Environment Setup Script for Windows PowerShell
# This script helps set up environment variables for different deployment scenarios

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Environment
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-Status {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

# Function to create environment file
function New-EnvironmentFile {
    param([string]$EnvType)
    
    $envFile = ".env.$EnvType"
    Write-Status "Creating $envFile for $EnvType environment..."
    
    switch ($EnvType) {
        "local" {
            @"
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
"@ | Out-File -FilePath $envFile -Encoding UTF8
        }
        "staging" {
            @"
# =============================================================================
# STAGING ENVIRONMENT
# =============================================================================
NODE_ENV=staging

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=https://your-staging-ec2-instance.com

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
"@ | Out-File -FilePath $envFile -Encoding UTF8
        }
        "production" {
            @"
# =============================================================================
# PRODUCTION ENVIRONMENT
# =============================================================================
NODE_ENV=production

# API Configuration
PORT=3001
NEXT_PUBLIC_API_URL=https://your-production-ec2-instance.com

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
"@ | Out-File -FilePath $envFile -Encoding UTF8
        }
        default {
            Write-Error "Unknown environment type: $EnvType"
            exit 1
        }
    }
    
    Write-Success "Created $envFile"
}

# Function to copy environment file
function Use-EnvironmentFile {
    param([string]$EnvType)
    
    $sourceFile = ".env.$EnvType"
    if (Test-Path $sourceFile) {
        Copy-Item $sourceFile ".env"
        Write-Success "Copied $sourceFile to .env"
    } else {
        Write-Error "$sourceFile not found. Run '.\scripts\setup-env.ps1 create $EnvType' first."
        exit 1
    }
}

# Function to validate environment file
function Test-EnvironmentFile {
    param([string]$EnvFile = ".env")
    
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file $EnvFile not found"
        return $false
    }
    
    Write-Status "Validating $EnvFile..."
    
    # Check for required variables
    $requiredVars = @("NODE_ENV", "PORT", "NEXT_PUBLIC_API_URL", "CORS_ORIGINS")
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        if (-not (Select-String -Path $EnvFile -Pattern "^${var}=" -Quiet)) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Warning "Missing required variables in ${EnvFile}:"
        $missingVars | ForEach-Object { Write-Host "  $_" }
        return $false
    }
    
    Write-Success "$EnvFile is valid"
    return $true
}

# Function to show current environment
function Show-CurrentEnvironment {
    if (Test-Path ".env") {
        Write-Status "Current .env file contents:"
        Write-Host "=================================="
        Get-Content ".env"
        Write-Host "=================================="
    } else {
        Write-Warning "No .env file found"
    }
}

# Main script logic
switch ($Command) {
    "create" {
        if (-not $Environment) {
            Write-Error "Please specify environment type: local, staging, or production"
            exit 1
        }
        New-EnvironmentFile $Environment
    }
    "use" {
        if (-not $Environment) {
            Write-Error "Please specify environment type: local, staging, or production"
            exit 1
        }
        Use-EnvironmentFile $Environment
    }
    "validate" {
        Test-EnvironmentFile
    }
    "show" {
        Show-CurrentEnvironment
    }
    "help" {
        Write-Host "Environment Setup Script for Windows PowerShell"
        Write-Host "=============================================="
        Write-Host ""
        Write-Host "Usage: .\scripts\setup-env.ps1 [command] [environment]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  create [env]    Create environment file (.env.local, .env.staging, .env.production)"
        Write-Host "  use [env]       Copy environment file to .env"
        Write-Host "  validate        Validate current .env file"
        Write-Host "  show            Show current .env file contents"
        Write-Host "  help            Show this help message"
        Write-Host ""
        Write-Host "Environments:"
        Write-Host "  local           Local development environment"
        Write-Host "  staging         Staging environment"
        Write-Host "  production      Production environment"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\scripts\setup-env.ps1 create local"
        Write-Host "  .\scripts\setup-env.ps1 use local"
        Write-Host "  .\scripts\setup-env.ps1 validate"
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host "Run '.\scripts\setup-env.ps1 help' for usage information."
        exit 1
    }
}

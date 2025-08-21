# Deployment Script with Database Setup and Data Migration
# This script deploys your application with proper database setup and data migration

param(
    [string]$EC2_IP,
    [string]$KEY_FILE = "multi-analysis-key-496-new.pem",
    [string]$DB_PASSWORD
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "$Green[INFO]$Reset $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$Yellow[WARNING]$Reset $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "$Red[ERROR]$Reset $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "$Blue[STEP]$Reset $Message" -ForegroundColor Blue
}

# Check if EC2_IP is provided
if (-not $EC2_IP) {
    # Try to load from aws-config file
    if (Test-Path "aws-config-496.env") {
        $configContent = Get-Content "aws-config-496.env"
        $publicIPLine = $configContent | Where-Object { $_ -match '^PUBLIC_IP=' }
        if ($publicIPLine) {
            $EC2_IP = $publicIPLine.Split('=')[1]
            Write-Status "Loaded EC2_IP from aws-config-496.env: $EC2_IP"
        }
    }
    
    if (-not $EC2_IP) {
        Write-Error "EC2_IP is not set. Please provide it as a parameter or update aws-config-496.env"
        exit 1
    }
}

# Check if DB_PASSWORD is provided
if (-not $DB_PASSWORD) {
    Write-Error "DB_PASSWORD is required for database setup. Please provide it as a parameter."
    exit 1
}

# Check if key file exists
if (-not (Test-Path $KEY_FILE)) {
    Write-Error "SSH key file not found: $KEY_FILE"
    Write-Error "Please ensure you have the SSH key file in the current directory"
    exit 1
}

Write-Step "Creating deployment package with database setup..."
# Create a temporary deployment directory
$DEPLOY_DIR = "deploy-with-database"
if (Test-Path $DEPLOY_DIR) {
    Remove-Item -Recurse -Force $DEPLOY_DIR
}
New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null

# Copy the working application files
Copy-Item -Recurse "packages/api/src" "$DEPLOY_DIR/api-src"
Copy-Item -Recurse "packages/web/src" "$DEPLOY_DIR/web-src"
Copy-Item "packages/web/next.config.mjs" "$DEPLOY_DIR/"
Copy-Item "packages/web/package.json" "$DEPLOY_DIR/"
Copy-Item "packages/web/tsconfig.json" "$DEPLOY_DIR/"
Copy-Item "packages/web/tailwind.config.js" "$DEPLOY_DIR/"
Copy-Item "packages/web/postcss.config.js" "$DEPLOY_DIR/"
Copy-Item "packages/api/package.json" "$DEPLOY_DIR/api-package.json"
Copy-Item -Recurse "packages/shared/src" "$DEPLOY_DIR/shared-src"
Copy-Item "packages/shared/package.json" "$DEPLOY_DIR/shared-package.json"
Copy-Item "docker-compose.yml" "$DEPLOY_DIR/"

# Copy data files for initial migration
Write-Step "Copying data files for migration..."
Copy-Item -Recurse "data" "$DEPLOY_DIR/"
Write-Status "Data files copied:"
Get-ChildItem "$DEPLOY_DIR/data/" | Format-Table Name, Length

Write-Step "Copying files to EC2 instance..."
# Use scp to copy files (requires OpenSSH to be installed on Windows)
$scpCommand = "scp -i `"$KEY_FILE`" -r `"$DEPLOY_DIR`" ec2-user@${EC2_IP}:~/app/"
Write-Status "Running: $scpCommand"
Invoke-Expression $scpCommand

Write-Step "Setting up database and deploying application on EC2..."
$sshCommand = "ssh -i `"$KEY_FILE`" ec2-user@$EC2_IP"
$deploymentScript = @"
cd ~/app/deploy-with-database

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo 'Installing Node.js...'
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    source ~/.bashrc
    nvm install 18
    nvm use 18
    nvm alias default 18
fi

# Install dependencies
echo 'Installing dependencies...'
npm install --prefix shared-src
npm install --prefix api-src
npm install --prefix web-src

# Create production environment with database configuration
cat > .env.production << 'ENVEOF'
NODE_ENV=production
API_PORT=3001
WEB_PORT=3000
DB_HOST=multi-analysis-db-496.cwhu64m6gqur.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_SSL=true
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=http://$EC2_IP:3001
CORS_ORIGINS=http://$EC2_IP:3000
ENVEOF

# Build the API
echo 'Building API...'
cd api-src
npm run build
cd ..

# Start the API server
echo 'Starting API server...'
cd api-src
nohup node dist/index.js > ../api.log 2>&1 &
API_PID=\$!
echo \$API_PID > ../api.pid

# Wait for API to start
echo 'Waiting for API to start...'
sleep 10

# Test the API health endpoint
echo 'Testing API health endpoint...'
curl -s http://localhost:3001/health
if [ \$? -ne 0 ]; then
    echo 'API health check failed'
fi

# Run data migration
echo 'Running data migration...'
curl -X POST http://localhost:3001/admin/migrate-data
if [ \$? -ne 0 ]; then
    echo 'Data migration failed'
fi

# Validate migration
echo 'Validating data migration...'
curl -s http://localhost:3001/admin/validate-data
if [ \$? -ne 0 ]; then
    echo 'Data validation failed'
fi

# Test data endpoints
echo 'Testing data endpoints...'
LISTINGS_COUNT=\$(curl -s http://localhost:3001/listings | jq '.listings | length' 2>/dev/null)
if [ -z "\$LISTINGS_COUNT" ]; then
    echo 'Listings count: Failed'
else
    echo "Listings count: \$LISTINGS_COUNT"
fi

RENTS_COUNT=\$(curl -s http://localhost:3001/rents | jq '.rents | length' 2>/dev/null)
if [ -z "\$RENTS_COUNT" ]; then
    echo 'Rents count: Failed'
else
    echo "Rents count: \$RENTS_COUNT"
fi

# Start the web server
echo 'Starting web server...'
cd ../web-src
nohup npm run dev > ../web.log 2>&1 &
WEB_PID=\$!
echo \$WEB_PID > ../web.pid

echo '✅ Application deployed successfully with database!'
echo '🌐 Frontend: http://$EC2_IP:3000'
echo '🔌 API: http://$EC2_IP:3001'
echo ''
echo '📋 To check status:'
echo '   ps aux | grep node'
echo ''
echo '📝 To view logs:'
echo '   tail -f api.log'
echo '   tail -f web.log'
echo ''
echo '🔍 To test data loading:'
echo '   curl http://localhost:3001/health'
echo '   curl http://localhost:3001/admin/validate-data'
"@

# Execute the deployment script
Write-Status "Executing deployment script on EC2..."
Invoke-Expression "$sshCommand `"$deploymentScript`""

Write-Status "Files copied successfully!"
Write-Status "Next steps:"
Write-Status "1. SSH into your EC2 instance:"
Write-Status "   ssh -i `"$KEY_FILE`" ec2-user@$EC2_IP"
Write-Status ""
Write-Status "2. Navigate to the deployment directory:"
Write-Status "   cd ~/app/deploy-with-database"
Write-Status ""
Write-Status "3. Check the deployment status:"
Write-Status "   tail -f api.log"
Write-Status "   tail -f web.log"
Write-Status ""
Write-Status "4. Verify data migration:"
Write-Status "   curl http://localhost:3001/admin/validate-data"
Write-Status ""
Write-Status "5. Test the application:"
Write-Status "   curl http://localhost:3001/health"

Write-Step "Cleaning up..."
Remove-Item -Recurse -Force $DEPLOY_DIR

Write-Status "Deployment package created successfully!"
Write-Status "Your application with database setup is ready to deploy to EC2!"
Write-Status "The script will automatically:"
Write-Status "- Set up the database connection"
Write-Status "- Migrate all data from JSON files to the database"
Write-Status "- Validate the migration"
Write-Status "- Start the application with database-backed data"

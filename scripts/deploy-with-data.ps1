# Deployment Script with Data Files (PowerShell)
# This script deploys your working local application AND data files to AWS EC2

param(
    [string]$EC2_IP,
    [string]$KEY_FILE = "multi-analysis-key-496-new.pem"
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

# Check if key file exists
if (-not (Test-Path $KEY_FILE)) {
    Write-Error "SSH key file not found: $KEY_FILE"
    Write-Error "Please ensure you have the SSH key file in the current directory"
    exit 1
}

Write-Step "Creating deployment package with data files..."
# Create a temporary deployment directory
$DEPLOY_DIR = "deploy-with-data"
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

# Copy data files - THIS IS THE KEY ADDITION
Write-Step "Copying data files..."
Copy-Item -Recurse "data" "$DEPLOY_DIR/"
Write-Status "Data files copied:"
Get-ChildItem "$DEPLOY_DIR/data/" | Format-Table Name, Length

Write-Step "Copying files to EC2 instance..."
# Use scp to copy files (requires OpenSSH to be installed on Windows)
$scpCommand = "scp -i `"$KEY_FILE`" -r `"$DEPLOY_DIR`" ec2-user@${EC2_IP}:~/app/"
Write-Status "Running: $scpCommand"
Invoke-Expression $scpCommand

Write-Status "Files copied successfully!"
Write-Status "Next steps:"
Write-Status "1. SSH into your EC2 instance:"
Write-Status "   ssh -i `"$KEY_FILE`" ec2-user@$EC2_IP"
Write-Status ""
Write-Status "2. Navigate to the deployment directory:"
Write-Status "   cd ~/app/deploy-with-data"
Write-Status ""
Write-Status "3. Install dependencies and start services:"
Write-Status "   npm install --prefix shared-src"
Write-Status "   npm install --prefix api-src"
Write-Status "   npm install --prefix web-src"
Write-Status ""
Write-Status "4. Start the API server:"
Write-Status "   cd api-src && nohup node index.js > ../api.log 2>&1 &"
Write-Status ""
Write-Status "5. Start the web server:"
Write-Status "   cd ../web-src && nohup npm run dev > ../web.log 2>&1 &"
Write-Status ""
Write-Status "6. Test the API:"
Write-Status "   curl http://localhost:3001/health"
Write-Status ""
Write-Status "7. View logs:"
Write-Status "   tail -f api.log"
Write-Status "   tail -f web.log"

Write-Step "Cleaning up..."
Remove-Item -Recurse -Force $DEPLOY_DIR

Write-Status "Deployment package created successfully!"
Write-Status "Your application with data files is ready to deploy to EC2!"

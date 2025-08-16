#!/bin/bash

# Quick Start AWS Deployment Script for Multi-Analysis Application
# This script creates infrastructure and deploys the application in one go

set -e

echo "🚀 Quick Start AWS Deployment for Multi-Analysis App..."
echo "This will create all AWS resources and deploy your application."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
print_step "Checking prerequisites..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first:"
    echo "  Windows: winget install Amazon.AWSCLI"
    echo "  macOS: brew install awscli"
    echo "  Linux: sudo apt-get install awscli"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if required scripts exist
if [ ! -f "scripts/aws-infrastructure.sh" ] || [ ! -f "scripts/launch-ec2.sh" ]; then
    print_error "Required scripts not found. Please ensure you're in the project root directory."
    exit 1
fi

print_status "Prerequisites check passed!"

# Confirm deployment
echo ""
print_warning "This deployment will create the following AWS resources:"
echo "  - VPC with subnets and security groups"
echo "  - RDS PostgreSQL database"
echo "  - ElastiCache Redis cluster"
echo "  - S3 bucket for data storage"
echo "  - EC2 instance running your application"
echo ""
print_warning "Estimated monthly cost: ~$80"
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled."
    exit 0
fi

# Step 1: Create infrastructure
print_step "Step 1: Creating AWS infrastructure..."
print_warning "This step will take 10-15 minutes to complete."

chmod +x scripts/aws-infrastructure.sh
./scripts/aws-infrastructure.sh

if [ $? -ne 0 ]; then
    print_error "Infrastructure creation failed. Please check the logs above."
    exit 1
fi

print_status "Infrastructure created successfully!"

# Step 2: Launch EC2 instance
print_step "Step 2: Launching EC2 instance and deploying application..."
print_warning "This step will take 5-10 minutes to complete."

chmod +x scripts/launch-ec2.sh
./scripts/launch-ec2.sh

if [ $? -ne 0 ]; then
    print_error "EC2 deployment failed. Please check the logs above."
    exit 1
fi

# Step 3: Upload data to S3
print_step "Step 3: Uploading data files to S3..."

# Load configuration
CONFIG_FILE=$(ls aws-config-*.env | head -1)
source $CONFIG_FILE

if [ -d "data" ]; then
    print_status "Uploading data files to S3 bucket: $S3_BUCKET"
    aws s3 cp data/ s3://$S3_BUCKET/data/ --recursive
    
    if [ $? -eq 0 ]; then
        print_status "Data files uploaded successfully!"
    else
        print_warning "Failed to upload data files. You can upload them manually later."
    fi
else
    print_warning "No data directory found. Skipping data upload."
fi

# Step 4: Display final summary
echo ""
echo "🎉 AWS deployment completed successfully!"
echo ""
print_step "Your application is now running on AWS!"
echo ""
echo "📋 Deployment Summary:"
echo "  - Infrastructure: Created"
echo "  - EC2 Instance: Running"
echo "  - Database: PostgreSQL on RDS"
echo "  - Cache: Redis on ElastiCache"
echo "  - Storage: S3 bucket configured"
echo ""

# Load final configuration
if [ -f "$CONFIG_FILE" ]; then
    source $CONFIG_FILE
    echo "🌐 Application URLs:"
    echo "  - Main Application: http://$PUBLIC_IP"
    echo "  - Health Check: http://$PUBLIC_IP/health"
    echo "  - Worker Health: http://$PUBLIC_IP:3001/health"
    echo ""
    echo "🔧 SSH Access:"
    echo "  ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
    echo ""
    echo "📊 Monitoring:"
    echo "  - Application logs: ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'sudo journalctl -u multi-analysis -f'"
    echo "  - Worker logs: ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'sudo journalctl -u multi-analysis-worker -f'"
    echo ""
    echo "📁 Configuration:"
    echo "  - Config file: $CONFIG_FILE"
    echo "  - Key pair: $KEY_FILE"
    echo ""
fi

echo "⚠️  Important next steps:"
echo "1. Test your application: curl http://$PUBLIC_IP/health"
echo "2. Set up a domain name (optional)"
echo "3. Configure SSL certificate"
echo "4. Set up CloudWatch alarms for monitoring"
echo "5. Review and optimize costs"
echo ""
echo "📚 Documentation:"
echo "  - AWS Setup Guide: aws-setup-guide.md"
echo "  - Deployment Guide: DEPLOYMENT_GUIDE.md"
echo ""
echo "🔒 Security reminders:"
echo "  - Keep your key pair file secure"
echo "  - Regularly update your application"
echo "  - Monitor AWS costs"
echo "  - Review security group rules"
echo ""
print_status "Deployment completed! Your multi-analysis application is now running on AWS."

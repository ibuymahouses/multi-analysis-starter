#!/bin/bash

# AWS Cleanup Script for Multi-Analysis Application
# This script removes all AWS resources created for the application

set -e

echo "🧹 AWS Cleanup Script for Multi-Analysis App..."
echo "This will remove all AWS resources created for your application."
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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

# Find configuration file
CONFIG_FILE=$(ls aws-config-*.env 2>/dev/null | head -1)

if [ -z "$CONFIG_FILE" ]; then
    print_error "No AWS configuration file found. Please run the deployment script first."
    exit 1
fi

print_status "Found configuration file: $CONFIG_FILE"

# Load configuration
source $CONFIG_FILE

# Confirm cleanup
echo ""
print_warning "This will permanently delete the following AWS resources:"
echo "  - EC2 Instance: $INSTANCE_ID"
echo "  - RDS Database: $DB_INSTANCE_ID"
echo "  - ElastiCache Redis: $REDIS_CLUSTER_ID"
echo "  - S3 Bucket: $S3_BUCKET"
echo "  - VPC: $VPC_ID"
echo "  - Security Groups: $API_SG_ID, $DB_SG_ID"
echo "  - Subnets: $SUBNET1_ID, $SUBNET2_ID"
echo "  - Route Table: $ROUTE_TABLE_ID"
echo "  - Internet Gateway: $IGW_ID"
echo "  - Key Pair: $KEY_NAME"
echo ""
print_warning "This action cannot be undone!"
echo ""

read -p "Are you sure you want to continue? Type 'DELETE' to confirm: " -r
if [[ ! $REPLY == "DELETE" ]]; then
    print_status "Cleanup cancelled."
    exit 0
fi

print_step "Starting cleanup process..."

# Step 1: Terminate EC2 instance
if [ ! -z "$INSTANCE_ID" ]; then
    print_step "Terminating EC2 instance: $INSTANCE_ID"
    aws ec2 terminate-instances --instance-ids $INSTANCE_ID > /dev/null
    print_status "EC2 instance termination initiated"
    
    # Wait for instance to be terminated
    print_status "Waiting for EC2 instance to be terminated..."
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID
    print_status "EC2 instance terminated"
fi

# Step 2: Delete RDS instance
if [ ! -z "$DB_INSTANCE_ID" ]; then
    print_step "Deleting RDS instance: $DB_INSTANCE_ID"
    aws rds delete-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --skip-final-snapshot \
        --delete-automated-backups > /dev/null
    print_status "RDS instance deletion initiated"
    
    # Wait for RDS to be deleted
    print_status "Waiting for RDS instance to be deleted..."
    aws rds wait db-instance-deleted --db-instance-identifier $DB_INSTANCE_ID
    print_status "RDS instance deleted"
fi

# Step 3: Delete ElastiCache Redis cluster
if [ ! -z "$REDIS_CLUSTER_ID" ]; then
    print_step "Deleting ElastiCache Redis cluster: $REDIS_CLUSTER_ID"
    aws elasticache delete-cache-cluster --cache-cluster-id $REDIS_CLUSTER_ID > /dev/null
    print_status "ElastiCache Redis cluster deletion initiated"
    
    # Wait for Redis to be deleted
    print_status "Waiting for ElastiCache Redis cluster to be deleted..."
    aws elasticache wait cache-cluster-deleted --cache-cluster-id $REDIS_CLUSTER_ID
    print_status "ElastiCache Redis cluster deleted"
fi

# Step 4: Delete S3 bucket and contents
if [ ! -z "$S3_BUCKET" ]; then
    print_step "Deleting S3 bucket: $S3_BUCKET"
    
    # Delete all objects in the bucket
    aws s3 rm s3://$S3_BUCKET --recursive > /dev/null 2>&1 || true
    
    # Delete the bucket
    aws s3 rb s3://$S3_BUCKET > /dev/null 2>&1 || true
    print_status "S3 bucket deleted"
fi

# Step 5: Delete RDS subnet group
if [ ! -z "$DB_SUBNET_GROUP" ]; then
    print_step "Deleting RDS subnet group: $DB_SUBNET_GROUP"
    aws rds delete-db-subnet-group --db-subnet-group-name $DB_SUBNET_GROUP > /dev/null 2>&1 || true
    print_status "RDS subnet group deleted"
fi

# Step 6: Delete ElastiCache subnet group
if [ ! -z "$REDIS_SUBNET_GROUP" ]; then
    print_step "Deleting ElastiCache subnet group: $REDIS_SUBNET_GROUP"
    aws elasticache delete-cache-subnet-group --cache-subnet-group-name $REDIS_SUBNET_GROUP > /dev/null 2>&1 || true
    print_status "ElastiCache subnet group deleted"
fi

# Step 7: Delete security groups
if [ ! -z "$API_SG_ID" ]; then
    print_step "Deleting API security group: $API_SG_ID"
    aws ec2 delete-security-group --group-id $API_SG_ID > /dev/null 2>&1 || true
    print_status "API security group deleted"
fi

if [ ! -z "$DB_SG_ID" ]; then
    print_step "Deleting database security group: $DB_SG_ID"
    aws ec2 delete-security-group --group-id $DB_SG_ID > /dev/null 2>&1 || true
    print_status "Database security group deleted"
fi

# Step 8: Delete subnets
if [ ! -z "$SUBNET1_ID" ]; then
    print_step "Deleting subnet 1: $SUBNET1_ID"
    aws ec2 delete-subnet --subnet-id $SUBNET1_ID > /dev/null 2>&1 || true
    print_status "Subnet 1 deleted"
fi

if [ ! -z "$SUBNET2_ID" ]; then
    print_step "Deleting subnet 2: $SUBNET2_ID"
    aws ec2 delete-subnet --subnet-id $SUBNET2_ID > /dev/null 2>&1 || true
    print_status "Subnet 2 deleted"
fi

# Step 9: Delete route table
if [ ! -z "$ROUTE_TABLE_ID" ]; then
    print_step "Deleting route table: $ROUTE_TABLE_ID"
    aws ec2 delete-route-table --route-table-id $ROUTE_TABLE_ID > /dev/null 2>&1 || true
    print_status "Route table deleted"
fi

# Step 10: Detach and delete internet gateway
if [ ! -z "$IGW_ID" ] && [ ! -z "$VPC_ID" ]; then
    print_step "Detaching internet gateway: $IGW_ID"
    aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID > /dev/null 2>&1 || true
    print_status "Internet gateway detached"
    
    print_step "Deleting internet gateway: $IGW_ID"
    aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID > /dev/null 2>&1 || true
    print_status "Internet gateway deleted"
fi

# Step 11: Delete VPC
if [ ! -z "$VPC_ID" ]; then
    print_step "Deleting VPC: $VPC_ID"
    aws ec2 delete-vpc --vpc-id $VPC_ID > /dev/null 2>&1 || true
    print_status "VPC deleted"
fi

# Step 12: Delete key pair
if [ ! -z "$KEY_NAME" ]; then
    print_step "Deleting key pair: $KEY_NAME"
    aws ec2 delete-key-pair --key-name $KEY_NAME > /dev/null 2>&1 || true
    print_status "Key pair deleted"
fi

# Step 13: Remove local files
print_step "Cleaning up local files..."

# Remove key file
if [ ! -z "$KEY_FILE" ] && [ -f "$KEY_FILE" ]; then
    rm -f "$KEY_FILE"
    print_status "Removed key file: $KEY_FILE"
fi

# Remove configuration file
if [ -f "$CONFIG_FILE" ]; then
    rm -f "$CONFIG_FILE"
    print_status "Removed configuration file: $CONFIG_FILE"
fi

# Step 14: Final summary
echo ""
echo "🎉 AWS cleanup completed successfully!"
echo ""
print_status "All AWS resources have been removed:"
echo "  ✅ EC2 Instance"
echo "  ✅ RDS Database"
echo "  ✅ ElastiCache Redis"
echo "  ✅ S3 Bucket"
echo "  ✅ VPC and Networking"
echo "  ✅ Security Groups"
echo "  ✅ Key Pair"
echo "  ✅ Local files"
echo ""
print_warning "Remember to:"
echo "  - Monitor your AWS billing to ensure no unexpected charges"
echo "  - Keep backups of any important data before cleanup"
echo "  - Update any DNS records if you had a custom domain"
echo ""
print_status "Cleanup completed! All resources have been removed from AWS."

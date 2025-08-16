#!/bin/bash

# AWS Infrastructure Setup Script for Multi-Analysis Application
# This script creates all necessary AWS resources

set -e

echo "🚀 Setting up AWS infrastructure for Multi-Analysis App..."

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

# Get current region
REGION=$(aws configure get region)
print_status "Using AWS region: $REGION"

# Generate unique suffix for resources
SUFFIX=$(date +%s | tail -c 4)
print_status "Using suffix: $SUFFIX"

# Step 1: Create VPC
print_step "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=multi-analysis-vpc-'$SUFFIX'}]' \
    --query 'Vpc.VpcId' \
    --output text)

print_status "Created VPC: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames

# Step 2: Create Internet Gateway
print_step "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=multi-analysis-igw-'$SUFFIX'}]' \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
print_status "Created and attached Internet Gateway: $IGW_ID"

# Step 3: Create Subnets
print_step "Creating subnets..."

# Get availability zones
AZ1=$(aws ec2 describe-availability-zones --query 'AvailabilityZones[0].ZoneName' --output text)
AZ2=$(aws ec2 describe-availability-zones --query 'AvailabilityZones[1].ZoneName' --output text)

# Create public subnets
SUBNET1_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone $AZ1 \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=multi-analysis-subnet1-'$SUFFIX'}]' \
    --query 'Subnet.SubnetId' \
    --output text)

SUBNET2_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone $AZ2 \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=multi-analysis-subnet2-'$SUFFIX'}]' \
    --query 'Subnet.SubnetId' \
    --output text)

print_status "Created subnets: $SUBNET1_ID, $SUBNET2_ID"

# Step 4: Create Route Table
print_step "Creating route table..."
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=multi-analysis-rt-'$SUFFIX'}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add route to internet gateway
aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate subnets with route table
aws ec2 associate-route-table --subnet-id $SUBNET1_ID --route-table-id $ROUTE_TABLE_ID
aws ec2 associate-route-table --subnet-id $SUBNET2_ID --route-table-id $ROUTE_TABLE_ID

print_status "Created and configured route table: $ROUTE_TABLE_ID"

# Step 5: Create Security Groups
print_step "Creating security groups..."

# API Security Group
API_SG_ID=$(aws ec2 create-security-group \
    --group-name multi-analysis-api-$SUFFIX \
    --description "Security group for API server" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Database Security Group
DB_SG_ID=$(aws ec2 create-security-group \
    --group-name multi-analysis-db-$SUFFIX \
    --description "Security group for database" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

print_status "Created security groups: API=$API_SG_ID, DB=$DB_SG_ID"

# Step 6: Configure Security Group Rules
print_step "Configuring security group rules..."

# API Security Group Rules
aws ec2 authorize-security-group-ingress \
    --group-id $API_SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $API_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $API_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $API_SG_ID \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0

# Database Security Group Rules (only allow access from API security group)
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $API_SG_ID

print_status "Configured security group rules"

# Step 7: Create Key Pair
print_step "Creating key pair..."
aws ec2 create-key-pair \
    --key-name multi-analysis-key-$SUFFIX \
    --query 'KeyMaterial' \
    --output text > multi-analysis-key-$SUFFIX.pem

chmod 400 multi-analysis-key-$SUFFIX.pem
print_status "Created key pair: multi-analysis-key-$SUFFIX.pem"

# Step 8: Create RDS Subnet Group
print_step "Creating RDS subnet group..."
aws rds create-db-subnet-group \
    --db-subnet-group-name multi-analysis-db-subnet-$SUFFIX \
    --db-subnet-group-description "Subnet group for multi-analysis database" \
    --subnet-ids $SUBNET1_ID $SUBNET2_ID

print_status "Created RDS subnet group: multi-analysis-db-subnet-$SUFFIX"

# Step 9: Create RDS Instance
print_step "Creating RDS instance..."
# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

aws rds create-db-instance \
    --db-instance-identifier multi-analysis-db-$SUFFIX \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username app \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --db-subnet-group-name multi-analysis-db-subnet-$SUFFIX \
    --vpc-security-group-ids $DB_SG_ID \
    --backup-retention-period 7 \
    --storage-encrypted \
    --tags 'Key=Name,Value=multi-analysis-db-'$SUFFIX

print_status "Creating RDS instance: multi-analysis-db-$SUFFIX"
print_warning "RDS instance creation takes 5-10 minutes. Please wait..."

# Step 10: Create ElastiCache Subnet Group
print_step "Creating ElastiCache subnet group..."
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name multi-analysis-redis-subnet-$SUFFIX \
    --cache-subnet-group-description "Subnet group for Redis" \
    --subnet-ids $SUBNET1_ID $SUBNET2_ID

print_status "Created ElastiCache subnet group: multi-analysis-redis-subnet-$SUFFIX"

# Step 11: Create ElastiCache Redis Cluster
print_step "Creating ElastiCache Redis cluster..."
aws elasticache create-cache-cluster \
    --cache-cluster-id multi-analysis-redis-$SUFFIX \
    --engine redis \
    --cache-node-type cache.t3.micro \
    --num-cache-nodes 1 \
    --cache-subnet-group-name multi-analysis-redis-subnet-$SUFFIX \
    --security-group-ids $API_SG_ID \
    --tags 'Key=Name,Value=multi-analysis-redis-'$SUFFIX

print_status "Creating ElastiCache Redis cluster: multi-analysis-redis-$SUFFIX"

# Step 12: Create S3 Bucket
print_step "Creating S3 bucket..."
BUCKET_NAME="multi-analysis-data-$SUFFIX"
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Enable versioning
aws s3api put-bucket-versioning --bucket $BUCKET_NAME --versioning-configuration Status=Enabled

print_status "Created S3 bucket: $BUCKET_NAME"

# Step 13: Save configuration
print_step "Saving configuration..."
cat > aws-config-$SUFFIX.env <<EOF
# AWS Infrastructure Configuration
# Generated on $(date)

# VPC and Networking
VPC_ID=$VPC_ID
SUBNET1_ID=$SUBNET1_ID
SUBNET2_ID=$SUBNET2_ID
API_SG_ID=$API_SG_ID
DB_SG_ID=$DB_SG_ID
ROUTE_TABLE_ID=$ROUTE_TABLE_ID
IGW_ID=$IGW_ID

# Database
DB_INSTANCE_ID=multi-analysis-db-$SUFFIX
DB_PASSWORD=$DB_PASSWORD
DB_SUBNET_GROUP=multi-analysis-db-subnet-$SUFFIX

# Redis
REDIS_CLUSTER_ID=multi-analysis-redis-$SUFFIX
REDIS_SUBNET_GROUP=multi-analysis-redis-subnet-$SUFFIX

# S3
S3_BUCKET=$BUCKET_NAME

# Key Pair
KEY_NAME=multi-analysis-key-$SUFFIX
KEY_FILE=multi-analysis-key-$SUFFIX.pem

# Region
AWS_REGION=$REGION
EOF

print_status "Configuration saved to: aws-config-$SUFFIX.env"

# Step 14: Wait for RDS to be available
print_step "Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier multi-analysis-db-$SUFFIX

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier multi-analysis-db-$SUFFIX \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id multi-analysis-redis-$SUFFIX \
    --query 'CacheClusters[0].ConfigurationEndpoint.Address' \
    --output text)

# Update configuration with endpoints
cat >> aws-config-$SUFFIX.env <<EOF

# Endpoints
DB_ENDPOINT=$DB_ENDPOINT
REDIS_ENDPOINT=$REDIS_ENDPOINT

# Connection Strings
DATABASE_URL=postgresql://app:$DB_PASSWORD@$DB_ENDPOINT:5432/app
REDIS_URL=redis://$REDIS_ENDPOINT:6379
EOF

print_status "Infrastructure setup completed!"
echo ""
echo "📋 Summary:"
echo "  VPC: $VPC_ID"
echo "  Subnets: $SUBNET1_ID, $SUBNET2_ID"
echo "  Security Groups: API=$API_SG_ID, DB=$DB_SG_ID"
echo "  RDS: multi-analysis-db-$SUFFIX ($DB_ENDPOINT)"
echo "  Redis: multi-analysis-redis-$SUFFIX ($REDIS_ENDPOINT)"
echo "  S3: $BUCKET_NAME"
echo "  Key Pair: multi-analysis-key-$SUFFIX.pem"
echo ""
echo "🔑 Database password: $DB_PASSWORD"
echo "📁 Configuration saved to: aws-config-$SUFFIX.env"
echo ""
echo "🚀 Next steps:"
echo "1. Launch EC2 instance using the security group: $API_SG_ID"
echo "2. Use the key pair: multi-analysis-key-$SUFFIX.pem"
echo "3. Configure your application with the connection strings in aws-config-$SUFFIX.env"
echo ""
echo "⚠️  Important: Keep the configuration file and key pair secure!"

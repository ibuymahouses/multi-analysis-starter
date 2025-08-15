# Deployment Guide - Static IP Setup

## AWS EC2 Deployment (Recommended)

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- Docker installed locally (for building images)

### Step 1: Launch EC2 Instance

1. **Go to AWS Console → EC2 → Launch Instance**
2. **Choose Amazon Linux 2023** (free tier eligible)
3. **Instance Type**: t2.micro (free tier) or t3.small for better performance
4. **Configure Security Group**:
   - SSH (22): Your IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - Custom TCP (3000): 0.0.0.0/0 (for your API)
   - Custom TCP (5432): 0.0.0.0/0 (for PostgreSQL)
   - Custom TCP (6379): 0.0.0.0/0 (for Redis)

### Step 2: Allocate Elastic IP

1. **EC2 → Elastic IPs → Allocate Elastic IP**
2. **Allocate** a new Elastic IP
3. **Associate** it with your EC2 instance
4. **Note the IP address** - this is your static IP!

### Step 3: Deploy Application

SSH into your instance and run:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Clone your repository
git clone <your-repo-url>
cd multi-analysis-starter

# Install dependencies
npm run install:all

# Start the application
npm run dev
```

### Step 4: Configure Environment Variables

Create `.env` file in your project root:

```env
# Database
DATABASE_URL=postgresql://app:app@localhost:5432/app
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Step 5: Set Up Reverse Proxy (Optional)

Install nginx for better production setup:

```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Create nginx config:

```nginx
# /etc/nginx/conf.d/api.conf
server {
    listen 80;
    server_name your-static-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Alternative: Railway Deployment (Easier)

1. **Sign up at railway.app**
2. **Connect your GitHub repository**
3. **Railway automatically detects your docker-compose.yml**
4. **Deploy** - Railway provides a static URL automatically

## Alternative: Heroku Deployment

1. **Install Heroku CLI**
2. **Create Heroku app**:
   ```bash
   heroku create your-app-name
   ```
3. **Add PostgreSQL addon**:
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```
4. **Deploy**:
   ```bash
   git push heroku main
   ```

## Testing Your Static IP

Once deployed, test your API:

```bash
# Test the API endpoint
curl http://your-static-ip:3000/api/health

# Or if using nginx
curl http://your-static-ip/api/health
```

## Security Considerations

1. **Use HTTPS** - Set up SSL certificate (Let's Encrypt)
2. **Implement rate limiting** - Already in your API
3. **Use environment variables** for secrets
4. **Regular security updates**
5. **Monitor logs** for suspicious activity

## Cost Estimation

- **AWS EC2 t2.micro**: Free tier (750 hours/month)
- **Elastic IP**: Free when attached to running instance
- **Data transfer**: ~$0.09/GB after free tier
- **Total**: ~$0-10/month for small applications

## Next Steps

1. **Set up monitoring** (CloudWatch, DataDog)
2. **Implement CI/CD** (GitHub Actions, AWS CodePipeline)
3. **Add load balancing** for high availability
4. **Set up automated backups** for your database

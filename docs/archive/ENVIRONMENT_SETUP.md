# Environment Configuration Guide

This guide helps you set up environment variables properly to avoid hard-coded localhost references and ensure your app works both locally and in production.

## 🚨 The Problem

Previously, your app had hard-coded localhost references in several places:
- CORS configuration in the API
- API base URL in the web app
- Database and Redis connection fallbacks

This caused issues when deploying because the app would try to connect to localhost instead of your production services.

## ✅ The Solution

We've implemented a comprehensive environment configuration system that:

1. **Uses environment variables** instead of hard-coded values
2. **Provides sensible defaults** for local development
3. **Validates configuration** to catch issues early
4. **Works across all environments** (local, staging, production)

## 🛠️ Quick Setup

### For Windows (PowerShell)

```powershell
# Create local development environment
.\scripts\setup-env.ps1 create local

# Use the local environment
.\scripts\setup-env.ps1 use local

# Validate your configuration
.\scripts\setup-env.ps1 validate
```

### For Linux/Mac (Bash)

```bash
# Create local development environment
./scripts/setup-env.sh create local

# Use the local environment
./scripts/setup-env.sh use local

# Validate your configuration
./scripts/setup-env.sh validate
```

## 📁 Environment Files

The system creates separate environment files for different scenarios:

- `.env.local` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment
- `.env` - Active environment (copied from one of the above)

## 🔧 Configuration Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development`, `staging`, `production` |
| `PORT` | API server port | `3001` |
| `NEXT_PUBLIC_API_URL` | API base URL for frontend | `http://localhost:3001` |
| `CORS_ORIGINS` | Allowed origins for CORS | `http://localhost:3000` |

### Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `multi_analysis` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |

### Redis Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | (empty) |
| `REDIS_DB` | Redis database number | `0` |

### Security Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `your-secret-key-change-in-production` |

### AWS Configuration (Production)

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | (empty) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | (empty) |
| `S3_BUCKET` | S3 bucket name | (empty) |

## 🌍 Environment-Specific Configuration

### Local Development

```bash
# Create local environment
.\scripts\setup-env.ps1 create local

# This creates .env.local with:
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000
DB_HOST=localhost
REDIS_HOST=localhost
```

### Staging Environment

```bash
# Create staging environment
.\scripts\setup-env.ps1 create staging

# Edit .env.staging with your staging values:
NEXT_PUBLIC_API_URL=https://staging-api.yourdomain.com
CORS_ORIGINS=https://staging.yourdomain.com
DB_HOST=staging-db.yourdomain.com
```

### Production Environment

```bash
# Create production environment
.\scripts\setup-env.ps1 create production

# Edit .env.production with your production values:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
DB_HOST=production-db.yourdomain.com
```

## 🔄 Switching Environments

To switch between environments:

```bash
# Switch to local development
.\scripts\setup-env.ps1 use local

# Switch to staging
.\scripts\setup-env.ps1 use staging

# Switch to production
.\scripts\setup-env.ps1 use production
```

## ✅ Validation

Always validate your configuration before deploying:

```bash
# Validate current .env file
.\scripts\setup-env.ps1 validate

# Show current configuration
.\scripts\setup-env.ps1 show
```

## 🚀 Deployment Workflow

### 1. Local Development
```bash
# Set up local environment
.\scripts\setup-env.ps1 create local
.\scripts\setup-env.ps1 use local
.\scripts\setup-env.ps1 validate

# Start development
npm run dev
```

### 2. Staging Deployment
```bash
# Set up staging environment
.\scripts\setup-env.ps1 create staging
# Edit .env.staging with your staging values
.\scripts\setup-env.ps1 use staging
.\scripts\setup-env.ps1 validate

# Deploy to staging
npm run deploy:staging
```

### 3. Production Deployment
```bash
# Set up production environment
.\scripts\setup-env.ps1 create production
# Edit .env.production with your production values
.\scripts\setup-env.ps1 use production
.\scripts\setup-env.ps1 validate

# Deploy to production
npm run deploy:production
```

## 🔧 Manual Configuration

If you prefer to configure manually, copy `env.example` to `.env` and edit:

```bash
cp env.example .env
# Edit .env with your values
```

## 🛡️ Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Rotate secrets regularly**
4. **Use environment-specific databases**
5. **Enable SSL in production**

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors**: Check `CORS_ORIGINS` includes your frontend URL
2. **Database connection errors**: Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD`
3. **API not found**: Check `NEXT_PUBLIC_API_URL` is correct
4. **Environment not loading**: Ensure `.env` file exists and is valid

### Debug Commands

```bash
# Check current environment
.\scripts\setup-env.ps1 show

# Validate configuration
.\scripts\setup-env.ps1 validate

# Check environment variables in your app
npm run dev
# Look for configuration logs in console
```

## 📚 Additional Resources

- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#processenv)
- [AWS Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)

## 🤝 Contributing

When adding new environment variables:

1. Add them to `packages/shared/src/config.ts`
2. Update `env.example`
3. Update the setup scripts
4. Document them in this guide

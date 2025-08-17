# Quick Start Guide

## For New Laptop Setup

When you open Cursor on a new laptop and want to start working on the Multi-Analysis project, simply say:

> **"Let's get started here"**

This will trigger the AI assistant to automatically run the setup script that:
1. Clones the repository (if needed)
2. Pulls the latest changes from GitHub
3. Installs all dependencies
4. Builds all packages
5. Sets up the local environment
6. Starts the database services (if Docker is available)

## What the Setup Script Does

The `scripts/setup-new-laptop.sh` script automatically:

- ✅ Checks if you're in the right directory
- ✅ Pulls latest changes from GitHub
- ✅ Verifies Node.js is installed
- ✅ Checks Docker status
- ✅ Installs all package dependencies
- ✅ Builds all packages
- ✅ Creates `.env` file from template
- ✅ Starts local database services
- ✅ Provides helpful next steps

## After Setup

Once the setup is complete, you can:

```bash
# Start development servers
npm run dev

# Or start individual services
npm run dev:api    # API server only
npm run dev:web    # Web server only

# Run database migrations
npm run db:migrate

# Run tests
npm run test
```

## Switching Between Laptops

### Before Switching (on current laptop):
```bash
git add .
git commit -m "WIP: current changes"
git push origin main
```

### On New Laptop:
Just say **"Let's get started here"** and the AI will handle everything!

## Feature Development

For new features, use feature branches:

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature
# ... make changes ...

# Commit and push
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name

# When complete, merge to main
git checkout main
git merge feature/your-feature-name
git push origin main
```

## Available Commands

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run test` - Run tests
- `npm run db:migrate` - Run database migrations
- `npm run install:all` - Install dependencies for all packages

## Troubleshooting

If something goes wrong during setup:

1. **Node.js not found**: Install Node.js 18+ from https://nodejs.org/
2. **Docker not running**: Start Docker Desktop
3. **Permission errors**: Run `chmod +x scripts/setup-new-laptop.sh`
4. **Git issues**: Make sure Git is installed and configured

## Environment Variables

The setup script will create a `.env` file from `.env.example`. You'll need to edit it with your specific configuration:

- Database connection strings
- API keys
- AWS credentials
- Other environment-specific settings

---

**Remember**: Just say **"Let's get started here"** and the AI will handle the rest! 🚀

#!/usr/bin/env node

/**
 * Migration script to move from old structure to new enterprise structure
 * This script will:
 * 1. Create the new monorepo structure
 * 2. Move existing files to appropriate packages
 * 3. Update dependencies and configurations
 * 4. Preserve existing data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting migration to enterprise structure...');

// Create new directory structure
const directories = [
  'packages/api/src',
  'packages/api/src/config',
  'packages/api/src/middleware',
  'packages/api/src/routes',
  'packages/api/src/services',
  'packages/api/src/database',
  'packages/web/src',
  'packages/web/src/components',
  'packages/web/src/pages',
  'packages/web/src/styles',
  'packages/shared/src',
  'infrastructure',
];

console.log('📁 Creating directory structure...');
directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ Created ${dir}`);
  }
});

// Move existing API files
console.log('📦 Moving API files...');
const apiMoves = [
  { from: 'api/src/index.js', to: 'packages/api/src/index.ts' },
  { from: 'api/src/analysis.js', to: 'packages/api/src/services/analysis.ts' },
  { from: 'api/src/auth/auth.js', to: 'packages/api/src/routes/auth.ts' },
  { from: 'api/src/auth/auth-memory.js', to: 'packages/api/src/routes/auth-memory.ts' },
  { from: 'api/src/database/connection.js', to: 'packages/api/src/database/connection.ts' },
  { from: 'api/src/database/memory-storage.js', to: 'packages/api/src/database/memory-storage.ts' },
  { from: 'api/src/database/schema.sql', to: 'packages/api/src/database/schema.sql' },
];

apiMoves.forEach(move => {
  if (fs.existsSync(move.from)) {
    const content = fs.readFileSync(move.from, 'utf8');
    fs.writeFileSync(move.to, content);
    console.log(`  ✓ Moved ${move.from} → ${move.to}`);
  }
});

// Move existing web files
console.log('🌐 Moving web files...');
const webMoves = [
  { from: 'app/src/components', to: 'packages/web/src/components' },
  { from: 'app/src/pages', to: 'packages/web/src/pages' },
  { from: 'app/src/styles', to: 'packages/web/src/styles' },
  { from: 'app/src/lib', to: 'packages/web/src/lib' },
  { from: 'app/next.config.mjs', to: 'packages/web/next.config.mjs' },
  { from: 'app/tailwind.config.js', to: 'packages/web/tailwind.config.js' },
  { from: 'app/tsconfig.json', to: 'packages/web/tsconfig.json' },
  { from: 'app/postcss.config.js', to: 'packages/web/postcss.config.js' },
];

webMoves.forEach(move => {
  if (fs.existsSync(move.from)) {
    if (fs.statSync(move.from).isDirectory()) {
      // Copy directory recursively
      copyDirectory(move.from, move.to);
    } else {
      const content = fs.readFileSync(move.from, 'utf8');
      fs.writeFileSync(move.to, content);
    }
    console.log(`  ✓ Moved ${move.from} → ${move.to}`);
  }
});

// Move worker files
console.log('⚙️ Moving worker files...');
const workerMoves = [
  { from: 'worker/src/index.js', to: 'packages/worker/src/index.ts' },
  { from: 'worker/package.json', to: 'packages/worker/package.json' },
];

workerMoves.forEach(move => {
  if (fs.existsSync(move.from)) {
    const content = fs.readFileSync(move.from, 'utf8');
    fs.writeFileSync(move.to, content);
    console.log(`  ✓ Moved ${move.from} → ${move.to}`);
  }
});

// Move infrastructure files
console.log('🏗️ Moving infrastructure files...');
const infraMoves = [
  { from: 'scripts/aws-infrastructure.sh', to: 'infrastructure/aws-infrastructure.sh' },
  { from: 'scripts/launch-ec2.sh', to: 'infrastructure/launch-ec2.sh' },
  { from: 'scripts/quick-start-aws.sh', to: 'infrastructure/quick-start-aws.sh' },
  { from: 'scripts/cleanup-aws.sh', to: 'infrastructure/cleanup-aws.sh' },
  { from: 'docker-compose.yml', to: 'infrastructure/docker-compose.yml' },
];

infraMoves.forEach(move => {
  if (fs.existsSync(move.from)) {
    const content = fs.readFileSync(move.from, 'utf8');
    fs.writeFileSync(move.to, content);
    console.log(`  ✓ Moved ${move.from} → ${move.to}`);
  }
});

// Create TypeScript configuration files
console.log('⚙️ Creating TypeScript configurations...');

// API tsconfig
const apiTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "ESNext",
    moduleResolution: "node",
    outDir: "./dist",
    rootDir: "./src",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true,
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist", "**/*.test.ts"]
};

fs.writeFileSync('packages/api/tsconfig.json', JSON.stringify(apiTsConfig, null, 2));

// Shared tsconfig
const sharedTsConfig = {
  compilerOptions: {
    target: "ES2020",
    module: "ESNext",
    moduleResolution: "node",
    outDir: "./dist",
    rootDir: "./src",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true,
  },
  include: ["src/**/*"],
  exclude: ["node_modules", "dist", "**/*.test.ts"]
};

fs.writeFileSync('packages/shared/tsconfig.json', JSON.stringify(sharedTsConfig, null, 2));

console.log('  ✓ Created TypeScript configurations');

// Create environment files
console.log('🔐 Creating environment files...');

const envExample = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multi_analysis
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=24h

# API Configuration
PORT=3000
NODE_ENV=development

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# AWS Configuration (for production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-s3-bucket-name

# Optional: External Services
SENTRY_DSN=your_sentry_dsn
STRIPE_SECRET_KEY=your_stripe_secret_key
`;

fs.writeFileSync('.env.example', envExample);
console.log('  ✓ Created .env.example');

// Update package.json scripts
console.log('📝 Updating package.json scripts...');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts = {
  ...packageJson.scripts,
  "postinstall": "npm run build --workspace=@multi-analysis/shared",
  "build:shared": "npm run build --workspace=@multi-analysis/shared",
  "build:api": "npm run build --workspace=@multi-analysis/api",
  "build:web": "npm run build --workspace=@multi-analysis/web",
  "dev:api": "npm run dev --workspace=@multi-analysis/api",
  "dev:web": "npm run dev --workspace=@multi-analysis/web",
  "start:api": "npm run start --workspace=@multi-analysis/api",
  "start:web": "npm run start --workspace=@multi-analysis/web",
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('  ✓ Updated root package.json');

// Create README for the new structure
console.log('📚 Creating documentation...');

const readmeContent = `# Multi-Analysis Enterprise Application

## 🏗️ Architecture

This is an enterprise-grade property analysis application built with:

- **Backend**: Node.js, Express.js, TypeScript, PostgreSQL, Redis
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with proper schema and indexing
- **Cache**: Redis for session management and caching
- **Deployment**: AWS (EC2, RDS, ElastiCache, S3)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Development
\`\`\`bash
# Install dependencies
npm run install:all

# Start local databases
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
\`\`\`

### Production Deployment
\`\`\`bash
# Deploy to AWS
npm run deploy:aws

# Deploy frontend to Vercel
npm run deploy:vercel
\`\`\`

## 📁 Project Structure

\`\`\`
multi-analysis-starter/
├── packages/
│   ├── api/                 # Backend API service
│   ├── web/                 # Frontend Next.js app
│   ├── shared/              # Shared types and utilities
│   └── worker/              # Background job processor
├── infrastructure/          # AWS/CDK/Terraform configs
├── scripts/                 # Build/deploy scripts
└── data/                    # Data files
\`\`\`

## 🔐 Environment Setup

Copy \`.env.example\` to \`.env\` and configure your environment variables.

## 📊 Database

The application uses PostgreSQL with a comprehensive schema including:
- Users and authentication
- Property listings
- Rent data
- Analysis results
- Search history
- System settings

## 🛠️ Development

- \`npm run dev\` - Start all development servers
- \`npm run build\` - Build all packages
- \`npm run test\` - Run tests
- \`npm run lint\` - Run linting

## 📚 Documentation

See \`ENTERPRISE_DEPLOYMENT_GUIDE.md\` for detailed deployment and configuration instructions.
`;

fs.writeFileSync('README.md', readmeContent);
console.log('  ✓ Created README.md');

// Helper function to copy directories recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n✅ Migration completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm run install:all');
console.log('2. Copy .env.example to .env and configure');
console.log('3. Start databases: docker-compose up -d');
console.log('4. Run migrations: npm run db:migrate');
console.log('5. Start development: npm run dev');
console.log('\n📚 See ENTERPRISE_DEPLOYMENT_GUIDE.md for detailed instructions');

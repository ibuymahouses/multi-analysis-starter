# Multi Analysis App — Starter

## 🚀 Quick Start

### Run in Codespaces (recommended - no setup needed)
1. Open this repo in **Cursor** → Command Palette → **GitHub Codespaces: Create New Codespace**.
2. When the Codespace opens, Command Palette → **Tasks: Run Task** → **Dev**.
3. In the Ports panel, make **3000** public → Open in Browser.

### Run locally with Docker
- Install **Docker Desktop** (for Postgres/Redis later) and **pnpm** (via `corepack enable`).
- `npm run install:all`
- `npm run dev`

### Run locally without Docker (simplified)
- Install **Node.js** (v18+)
- Fix PowerShell execution policy (see troubleshooting below)
- `npm run install:all`
- `npm run dev`
- Note: Database features will be limited until Docker is set up

## 📚 Documentation

- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Documentation Archive](docs/archive/)** - Previous documentation versions

## 🔧 Troubleshooting

### PowerShell Execution Policy Error
If you see "running scripts is disabled on this system":
1. **Open PowerShell as Administrator**
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Type `Y` to confirm
4. Try the installation commands again

### Docker Issues
If Docker isn't working:
1. **Install Docker Desktop**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Check Windows requirements**: Windows 10/11 Pro/Enterprise/Education with WSL 2
3. **Enable virtualization**: Check BIOS settings for Intel VT-x or AMD-V
4. **Use Codespaces**: Skip Docker entirely by using GitHub Codespaces

### Alternative: Use Command Prompt
If PowerShell continues to have issues:
1. Open **Command Prompt** (cmd.exe)
2. Navigate to your project: `cd "C:\Users\Dave_Myers\New Project for Tutorial\multi-analysis-starter"`
3. Run: `npm run install:all`
4. Run: `npm run dev`

## 📊 Seeding data
Place your MLS CSV at `seed/data/mls.csv`, then:
- **Tasks: Run Task** → **Seed MLS**
- **Tasks: Run Task** → **Seed Rents** (HUD/BHA placeholders for now) 
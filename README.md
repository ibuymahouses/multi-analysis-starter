# Multi Analysis App — Starter

## Run in Codespaces (recommended)
1. Open this repo in **Cursor** → Command Palette → **GitHub Codespaces: Create New Codespace**.
2. When the Codespace opens, Command Palette → **Tasks: Run Task** → **Dev**.
3. In the Ports panel, make **3000** public → Open in Browser.

## Run locally (fallback)
- Install **Docker Desktop** (for Postgres/Redis later) and **pnpm** (via `corepack enable`).
- `pnpm i`
- `pnpm dev`

## Seeding data
Place your MLS CSV at `seed/data/mls.csv`, then:
- **Tasks: Run Task** → **Seed MLS**
- **Tasks: Run Task** → **Seed Rents** (HUD/BHA placeholders for now) 
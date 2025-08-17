# Multi-Analysis Feature Branch Reference

## Quick Branch Overview

**Current Feature Branches:**
- `feature/user-authentication` - Login, registration, JWT management
- `feature/property-listings` - Property search, filtering, pagination
- `feature/property-details` - Property detail pages, analysis tools
- `feature/rental-analysis` - Rental calculations, market analysis
- `feature/homepage` - Landing page, navigation, hero sections

**Main Branch:** `master` - Contains all test pages and core infrastructure

## Detailed Branch Information

### 1. `feature/user-authentication`
**Purpose:** User authentication and session management
**Main File:** `app/src/pages/login.tsx` (7.6KB, 215 lines)
**Development Focus:**
- Login form validation and submission
- User registration workflow
- Password reset functionality
- JWT token management
- User session handling
- Authentication middleware

**When to Use This Branch:**
- Adding new authentication features
- Modifying login/registration forms
- Implementing password reset
- Adding OAuth integration
- Updating authentication security
- Adding user profile management

**Common Commands:**
```bash
git checkout feature/user-authentication
# Make changes to login.tsx or auth-related files
git add .
git commit -m "feat(auth): add password reset functionality"
git push origin feature/user-authentication
```

### 2. `feature/property-listings`
**Purpose:** Property search and listing display
**Main File:** `app/src/pages/listings.tsx` (35KB, 1027 lines)
**Development Focus:**
- Property search interface
- Advanced filtering options
- Sorting and pagination
- Property grid/list views
- Search results display
- Property data management

**When to Use This Branch:**
- Adding new search filters
- Improving property display
- Adding sorting options
- Implementing pagination
- Adding property comparison features
- Optimizing search performance
- Adding map integration

**Common Commands:**
```bash
git checkout feature/property-listings
# Make changes to listings.tsx or search components
git add .
git commit -m "feat(listings): add advanced property filtering"
git push origin feature/property-listings
```

### 3. `feature/property-details`
**Purpose:** Individual property detail pages and analysis
**Main File:** `app/src/pages/property/[LIST_NO].tsx` (68KB, 1686 lines)
**Development Focus:**
- Property information display
- Property analysis tools
- Image galleries and media
- Contact forms
- Similar properties
- Property comparison features
- Detailed property data

**When to Use This Branch:**
- Adding new property detail sections
- Implementing image galleries
- Adding contact forms
- Creating property analysis tools
- Adding similar properties feature
- Improving property data display
- Adding property sharing features

**Common Commands:**
```bash
git checkout feature/property-details
# Make changes to property detail page or components
git add .
git commit -m "feat(property): add image gallery component"
git push origin feature/property-details
```

### 4. `feature/rental-analysis`
**Purpose:** Rental rate analysis and calculation tools
**Main Files:** 
- `app/src/pages/rental-rates.tsx` (5.9KB, 155 lines)
- `app/src/pages/api/rental-rates.ts` (739B, 22 lines)
**Development Focus:**
- Rental rate calculations
- Market analysis tools
- Data visualization
- Export functionality
- Rental comparison features
- Market trend analysis

**When to Use This Branch:**
- Adding new rental calculation methods
- Implementing data visualization
- Adding export features
- Creating market analysis tools
- Adding rental comparison features
- Improving calculation accuracy
- Adding historical data analysis

**Common Commands:**
```bash
git checkout feature/rental-analysis
# Make changes to rental analysis pages or API
git add .
git commit -m "feat(rental): add market trend visualization"
git push origin feature/rental-analysis
```

### 5. `feature/homepage`
**Purpose:** Main landing page and navigation
**Main File:** `app/src/pages/index.tsx` (6.4KB, 159 lines)
**Development Focus:**
- Landing page design
- Navigation structure
- Hero sections
- Feature highlights
- Call-to-action elements
- Site branding

**When to Use This Branch:**
- Updating homepage design
- Adding new navigation features
- Improving hero sections
- Adding feature highlights
- Updating call-to-action elements
- Improving site branding
- Adding testimonials or social proof

**Common Commands:**
```bash
git checkout feature/homepage
# Make changes to homepage or navigation
git add .
git commit -m "feat(homepage): add new hero section design"
git push origin feature/homepage
```

## Test Pages (Master Branch Only)

These pages remain on the master branch for development/testing:
- `test-ag-grid.tsx` - AG Grid testing
- `test-excel-table.tsx` - Excel-style table testing
- `test-simple.tsx` - Simple component testing
- `test-table.tsx` - Table component testing
- `test-excel-filter.tsx` - Excel filter testing
- `test-undo-redo.tsx` - Undo/redo functionality testing

## Standard Workflow Commands

### Starting Work on a Feature
```bash
# 1. Ensure you're on master and up to date
git checkout master
git pull origin master

# 2. Switch to the appropriate feature branch
git checkout feature/[branch-name]

# 3. Make your changes
# ... edit files ...

# 4. Commit with conventional commit format
git add .
git commit -m "feat(scope): description of changes"

# 5. Push to GitHub
git push origin feature/[branch-name]
```

### Merging Features to Master
```bash
# 1. Switch to master and update
git checkout master
git pull origin master

# 2. Merge the feature branch
git merge feature/[branch-name]

# 3. Push to GitHub
git push origin master

# 4. Clean up (optional)
git branch -d feature/[branch-name]
git push origin --delete feature/[branch-name]
```

### Creating New Feature Branches
```bash
# 1. Start from master
git checkout master
git pull origin master

# 2. Create new feature branch
git checkout -b feature/new-feature-name

# 3. Push new branch
git push -u origin feature/new-feature-name
```

## Conventional Commit Format

Use this format for all commits:
```bash
git commit -m "type(scope): description"

# Examples:
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(listings): resolve pagination issue"
git commit -m "refactor(property): extract image gallery component"
git commit -m "docs(homepage): update hero section copy"
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

## Branch Decision Guide

### Use Feature Branch When:
- Adding new functionality
- Making significant changes to existing features
- Working on complex features that might break other parts
- Adding new API endpoints
- Implementing new UI components
- Making database schema changes
- Working on features that need testing in isolation

### Use Master Branch When:
- Making minor text changes
- Updating documentation
- Adding simple test pages
- Making small UI tweaks
- Fixing minor typos
- Adding comments or code cleanup

## Quick Reference Commands

```bash
# List all branches
git branch -a

# Switch to a feature branch
git checkout feature/[branch-name]

# Create new feature branch
git checkout -b feature/new-feature

# Push new branch to GitHub
git push -u origin feature/new-feature

# Update feature branch from master
git checkout master
git pull origin master
git checkout feature/[branch-name]
git merge master

# See what's different between branches
git diff master..feature/[branch-name]

# Stash changes when switching branches
git stash
git checkout feature/[branch-name]
git stash pop
```

## Repository Information

- **Repository:** multi-analysis-starter
- **Main Branch:** master
- **Feature Branches:** 5 active branches
- **Test Pages:** 6 test pages on master
- **Setup Script:** `scripts/setup-new-laptop.sh`
- **Documentation:** `FEATURE_BRANCHES.md`, `QUICK_START.md`

This reference ensures consistent, accurate information about the feature branch structure across all conversations.

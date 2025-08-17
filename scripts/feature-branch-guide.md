# Feature Branch Workflow Guide

## What are Feature Branches?

Feature branches are separate branches in Git that allow you to work on new features, bug fixes, or experiments without affecting the main codebase. They're essential for collaborative development and maintaining a stable main branch.

## When to Use Feature Branches

### ✅ Use Feature Branches For:
- **New Features**: Adding new functionality to your app
- **Bug Fixes**: Fixing issues in the codebase
- **Refactoring**: Improving code structure without changing functionality
- **Experiments**: Testing new approaches or libraries
- **Database Changes**: Schema modifications or migrations
- **API Changes**: Adding new endpoints or modifying existing ones
- **UI/UX Updates**: Frontend changes and improvements

### ❌ Don't Use Feature Branches For:
- **Minor typos**: Use direct commits to main
- **Documentation updates**: Usually safe to commit directly
- **Hotfixes**: Use a separate hotfix branch workflow

## Feature Branch Workflow

### 1. Create a Feature Branch

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/user-authentication

# Or create a branch for a bug fix
git checkout -b fix/login-error

# Or create a branch for refactoring
git checkout -b refactor/api-structure
```

### 2. Work on Your Feature

```bash
# Make your changes, then commit them
git add .
git commit -m "feat: add user authentication with JWT"

# Push the branch to GitHub
git push origin feature/user-authentication
```

### 3. Keep Your Branch Updated

```bash
# While working on your feature, periodically update from main
git checkout main
git pull origin main
git checkout feature/user-authentication
git merge main

# Or use rebase for a cleaner history
git rebase main
```

### 4. Complete Your Feature

```bash
# When your feature is complete, merge back to main
git checkout main
git pull origin main
git merge feature/user-authentication

# Push to GitHub
git push origin main

# Clean up - delete the feature branch
git branch -d feature/user-authentication
git push origin --delete feature/user-authentication
```

## Branch Naming Conventions

### Recommended Format:
```
type/description
```

### Examples:
- `feature/user-authentication`
- `fix/login-validation-error`
- `refactor/api-response-structure`
- `feat/add-property-search`
- `bugfix/rental-rate-calculation`
- `enhancement/improve-ui-performance`

### Types:
- `feature/` or `feat/` - New functionality
- `fix/` or `bugfix/` - Bug fixes
- `refactor/` - Code improvements
- `enhancement/` - Improvements to existing features
- `docs/` - Documentation changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

## Best Practices

### 1. Keep Branches Small and Focused
```bash
# Good: One feature per branch
feature/user-login
feature/user-registration
feature/password-reset

# Bad: Multiple features in one branch
feature/user-system
```

### 2. Commit Frequently with Clear Messages
```bash
# Good commit messages
git commit -m "feat: add JWT token validation"
git commit -m "fix: resolve CORS issue with API calls"
git commit -m "refactor: extract database connection logic"

# Bad commit messages
git commit -m "stuff"
git commit -m "fixes"
git commit -m "wip"
```

### 3. Use Conventional Commits
```bash
# Format: type(scope): description
git commit -m "feat(auth): add JWT token validation"
git commit -m "fix(api): resolve CORS issue with rental rates endpoint"
git commit -m "refactor(database): extract connection pool logic"
```

### 4. Test Before Merging
```bash
# Always test your changes before merging
npm run test
npm run build
npm run lint

# If you have integration tests
npm run test:integration
```

## Quick Reference Commands

### Creating and Switching Branches
```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Switch to existing branch
git checkout feature/new-feature

# List all branches
git branch -a

# List local branches
git branch
```

### Working with Branches
```bash
# Push new branch to GitHub
git push -u origin feature/new-feature

# Update branch from main
git checkout main
git pull origin main
git checkout feature/new-feature
git merge main

# See what's different between branches
git diff main..feature/new-feature
```

### Merging and Cleanup
```bash
# Merge feature branch to main
git checkout main
git merge feature/new-feature

# Delete local branch
git branch -d feature/new-feature

# Delete remote branch
git push origin --delete feature/new-feature
```

## Example Workflow for Your Project

### Adding a New API Endpoint
```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feature/add-property-search-api

# 2. Make changes
# - Add new endpoint in packages/api/src/routes/
# - Update types in packages/shared/src/types.ts
# - Add tests

# 3. Commit changes
git add .
git commit -m "feat(api): add property search endpoint with filters"

# 4. Push and create pull request
git push -u origin feature/add-property-search-api

# 5. After review and approval, merge
git checkout main
git merge feature/add-property-search-api
git push origin main

# 6. Clean up
git branch -d feature/add-property-search-api
git push origin --delete feature/add-property-search-api
```

## When to Merge to Main

### ✅ Ready to Merge:
- Feature is complete and tested
- All tests pass
- Code review is approved
- No conflicts with main branch

### ❌ Not Ready to Merge:
- Feature is incomplete
- Tests are failing
- Code review is pending
- Conflicts with main branch

## Troubleshooting

### Merge Conflicts
```bash
# If you get merge conflicts
git status  # See which files have conflicts
# Edit files to resolve conflicts
git add .   # Mark conflicts as resolved
git commit  # Complete the merge
```

### Stashing Changes
```bash
# If you need to switch branches but have uncommitted changes
git stash
git checkout main
git pull origin main
git checkout feature/your-feature
git stash pop  # Restore your changes
```

This workflow will help you maintain a clean, organized codebase and collaborate effectively with others (or your future self on different laptops!).

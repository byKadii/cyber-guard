# 🚀 GitHub Push Instructions

Your local git repository is ready with all files committed. Follow these steps to push to GitHub:

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create new repository with name: `cyber-guard`
3. **Do NOT initialize** with README, .gitignore, or LICENSE (we already have them)
4. Click "Create repository"

## Step 2: Add Remote and Push

Run these commands in PowerShell (from the project directory):

```powershell
# Add GitHub as remote (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/cyber-guard.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Set Up GitHub Authentication (if prompted)

When pushing, you may be asked to authenticate. You have two options:

### Option A: Personal Access Token (Recommended)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`
4. Copy the token
5. When prompted for password, paste the token

### Option B: SSH Key
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your-email@example.com"`
2. Add to GitHub: https://github.com/settings/keys
3. Use SSH remote: `git remote set-url origin git@github.com:USERNAME/cyber-guard.git`

## Complete Pushed Files

✅ All source files included:
- Backend Flask app with authentication
- Frontend HTML, CSS, JavaScript
- Chrome Extension files
- Configuration files (.gitignore, README.md)
- Database schema (auto-created on first run)

❌ Excluded from push (via .gitignore):
- Virtual environment (venv/)
- Model files (*.pkl)
- Database file (cyber_guard.db)
- Node modules
- IDE settings

## After Pushing

Your repository will be at: `https://github.com/USERNAME/cyber-guard`

### Add collaborators:
1. Go to repository Settings → Collaborators
2. Add GitHub usernames of team members

### Enable GitHub Pages (optional):
1. Settings → Pages
2. Set source to `main` branch → `/root` folder
3. Your site will be published

## Commands Summary

```powershell
# One-time setup
git remote add origin https://github.com/USERNAME/cyber-guard.git
git branch -M main
git push -u origin main

# Future pushes
git add .
git commit -m "Your message"
git push
```

---

Need help? Check GitHub's documentation: https://docs.github.com/en/get-started

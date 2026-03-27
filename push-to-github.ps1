# PowerShell script to push to GitHub

# Initialize git repository if not already initialized
if (-not (Test-Path .git)) {
    Write-Host "Initializing git repository..." -ForegroundColor Green
    git init
}

# Add the remote repository
Write-Host "Adding remote repository..." -ForegroundColor Green
git remote add origin https://github.com/rafi79/aiagentwatcheri.git 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote set-url origin https://github.com/rafi79/aiagentwatcheri.git
}

# Add all files
Write-Host "Adding files..." -ForegroundColor Green
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Green
git commit -m "Initial commit: AI Agent Watcher project"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host "Done! Your code has been pushed to GitHub." -ForegroundColor Cyan

# PowerShell script to force push to GitHub (overwrites remote)

# Initialize git repository if not already initialized
if (-not (Test-Path .git)) {
    Write-Host "Initializing git repository..." -ForegroundColor Green
    git init
}

# Add the remote repository
Write-Host "Adding remote repository..." -ForegroundColor Green
git remote add origin https://github.com/rafi79/aiagentwatcher.git 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote set-url origin https://github.com/rafi79/aiagentwatcher.git
}

# Add all files
Write-Host "Adding files..." -ForegroundColor Green
git add .

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Green
git commit -m "Initial commit: AI Agent Watcher project" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No new changes to commit" -ForegroundColor Yellow
}

# Force push to GitHub (overwrites remote)
Write-Host "Force pushing to GitHub (this will overwrite remote)..." -ForegroundColor Yellow
git branch -M main
git push -u origin main --force

Write-Host "Done! Your code has been pushed to GitHub." -ForegroundColor Cyan

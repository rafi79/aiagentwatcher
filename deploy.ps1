# Quick deploy script
Write-Host "Deploying to GitHub..." -ForegroundColor Cyan

git add .
git commit -m "Fix agent detection system - move client-traps to public folder"
git push

Write-Host "Deployed! Check Vercel for build status." -ForegroundColor Green

@echo off
REM Windows batch script to push to GitHub

REM Initialize git repository if not already initialized
if not exist .git (
    echo Initializing git repository...
    git init
)

REM Add the remote repository
echo Adding remote repository...
git remote add origin https://github.com/rafi79/aiagentwatcheri.git 2>nul || git remote set-url origin https://github.com/rafi79/aiagentwatcheri.git

REM Add all files
echo Adding files...
git add .

REM Commit changes
echo Committing changes...
git commit -m "Initial commit: AI Agent Watcher project"

REM Push to GitHub
echo Pushing to GitHub...
git branch -M main
git push -u origin main

echo Done! Your code has been pushed to GitHub.
pause

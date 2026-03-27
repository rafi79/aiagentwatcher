#!/bin/bash

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
fi

# Add the remote repository
echo "Adding remote repository..."
git remote add origin https://github.com/rafi79/aiagentwatcheri.git 2>/dev/null || git remote set-url origin https://github.com/rafi79/aiagentwatcheri.git

# Add all files
echo "Adding files..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Initial commit: AI Agent Watcher project"

# Push to GitHub
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "Done! Your code has been pushed to GitHub."

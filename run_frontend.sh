#!/bin/bash
# Runs frontend development server

set -e  # Exit on error

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if frontend directory exists
if [ ! -d "$DIR/frontend" ]; then
    echo "❌ Error: frontend directory not found at $DIR/frontend"
    exit 1
fi

# Navigate to frontend
cd "$DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local from .env.example"
    else
        echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000' > .env.local
        echo "✅ Created default .env.local"
    fi
fi

# Run dev server
echo "🚀 Starting frontend server..."
npm run dev

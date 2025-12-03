#!/bin/bash
# Auto-activates venv and runs backend server

set -e  # Exit on error

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if virtual environment exists
if [ ! -d "$DIR/.venv" ]; then
    echo "❌ Error: Virtual environment not found at $DIR/.venv"
    echo "Please run: python3.11 -m venv .venv"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source "$DIR/.venv/bin/activate"

# Check if uvicorn is installed
if ! command -v uvicorn &> /dev/null; then
    echo "❌ Error: uvicorn not found. Installing dependencies..."
    pip install -r "$DIR/requirements.txt"
fi

# Run uvicorn
echo "🚀 Starting backend server..."
uvicorn app.main:app --reload

#!/bin/bash
# Quick setup script for Ollama integration

set -e

echo "=================================="
echo "  TattvaDrishti - Ollama Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama is not installed.${NC}"
    echo ""
    echo "To install Ollama, run:"
    echo "  Linux:   curl -fsSL https://ollama.com/install.sh | sh"
    echo "  macOS:   brew install ollama"
    echo "  Windows: Download from https://ollama.com/download/windows"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo -e "${GREEN}✓ Ollama is installed${NC}"

# Check if Ollama server is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama server is running${NC}"
else
    echo -e "${YELLOW}! Ollama server is not running${NC}"
    echo ""
    echo "Starting Ollama server in background..."
    nohup ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Ollama server started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start Ollama server${NC}"
        echo "Check logs at: /tmp/ollama.log"
        exit 1
    fi
fi

# Check which models are installed
echo ""
echo "Checking installed models..."
MODELS=$(ollama list 2>/dev/null || echo "")

MODEL_TO_USE="llama3.2:3b"
BACKUP_MODEL="llama3.2:1b"

if echo "$MODELS" | grep -q "$MODEL_TO_USE"; then
    echo -e "${GREEN}✓ Recommended model '$MODEL_TO_USE' is installed${NC}"
elif echo "$MODELS" | grep -q "$BACKUP_MODEL"; then
    echo -e "${YELLOW}! Recommended model not found, but '$BACKUP_MODEL' is available${NC}"
    MODEL_TO_USE="$BACKUP_MODEL"
else
    echo -e "${YELLOW}! Recommended model '$MODEL_TO_USE' is not installed${NC}"
    echo ""
    read -p "Would you like to download it now? (~2GB download) [Y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo "Downloading $MODEL_TO_USE..."
        ollama pull "$MODEL_TO_USE"
        echo -e "${GREEN}✓ Model downloaded successfully${NC}"
    else
        echo ""
        echo "You can download it later with:"
        echo "  ollama pull $MODEL_TO_USE"
        echo ""
        echo "Or use a smaller model:"
        echo "  ollama pull llama3.2:1b  # ~1GB, faster but less accurate"
        exit 0
    fi
fi

# Update or create .env file
echo ""
echo "Configuring environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        touch .env
        echo -e "${GREEN}✓ Created new .env file${NC}"
    fi
fi

# Update Ollama settings in .env
if grep -q "OLLAMA_ENABLED" .env; then
    sed -i.bak "s/OLLAMA_ENABLED=.*/OLLAMA_ENABLED=true/" .env
else
    echo "OLLAMA_ENABLED=true" >> .env
fi

if grep -q "OLLAMA_MODEL" .env; then
    sed -i.bak "s/OLLAMA_MODEL=.*/OLLAMA_MODEL=$MODEL_TO_USE/" .env
else
    echo "OLLAMA_MODEL=$MODEL_TO_USE" >> .env
fi

echo -e "${GREEN}✓ Environment configured${NC}"

# Test Ollama
echo ""
echo "Testing Ollama integration..."
TEST_RESPONSE=$(ollama run "$MODEL_TO_USE" "Respond with only 'OK' if you can read this." 2>&1 | head -n 5)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Ollama is working correctly${NC}"
else
    echo -e "${YELLOW}! Ollama test had issues, but may still work${NC}"
    echo "Response: $TEST_RESPONSE"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Configuration:"
echo "  - Model: $MODEL_TO_USE"
echo "  - Server: http://localhost:11434"
echo "  - Status: Enabled"
echo ""
echo "Next steps:"
echo "  1. Start the backend: uvicorn app.main:app --reload"
echo "  2. Visit: http://localhost:8000/docs"
echo "  3. Test the /api/v1/detect endpoint"
echo ""
echo "For more details, see: docs/OLLAMA_SETUP.md"
echo ""

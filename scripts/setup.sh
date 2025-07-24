#!/bin/bash
# Startup script for development

echo "🎮 Starting OnlyOne Party Game..."

# Environment variables
export ENVIRONMENT=development
export NODE_ENV=development

echo "🌐 Game will be available at: https://localhost"
echo "🔧 Backend available at: http://localhost:3001"
echo ""

# Start
docker-compose -f docker-compose.yml up --build

echo "🛑 To stop: docker-compose -f docker-compose.yml down"
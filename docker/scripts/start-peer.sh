#!/bin/bash

# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2025 Guilherme Ferrari Brescia

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DOCKER_DIR")"

echo -e "${BLUE}🐳 Orch-OS P2P Peer Simulator Startup${NC}"
echo -e "${YELLOW}📁 Docker directory: $DOCKER_DIR${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${RED}❌ docker-compose is not installed. Please install docker-compose first.${NC}"
    exit 1
fi

# Navigate to docker directory
cd "$DOCKER_DIR"

# Clean up any existing containers
echo -e "${YELLOW}🧹 Cleaning up existing containers...${NC}"
docker-compose down --remove-orphans --volumes 2>/dev/null || true

# Build the peer simulator image
echo -e "${BLUE}🔨 Building peer simulator image...${NC}"
docker-compose build peer-simulator

# Start the peer simulator
echo -e "${GREEN}🚀 Starting peer simulator...${NC}"
docker-compose up -d peer-simulator

# Wait for container to be healthy
echo -e "${YELLOW}⏳ Waiting for peer simulator to be ready...${NC}"
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose ps peer-simulator | grep -q "healthy"; then
        echo -e "${GREEN}✅ Peer simulator is ready!${NC}"
        break
    fi
    
    if [ $counter -eq 0 ]; then
        echo -n "   "
    fi
    echo -n "."
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo -e "\n${RED}❌ Timeout waiting for peer simulator to be ready${NC}"
    echo -e "${YELLOW}📋 Container logs:${NC}"
    docker-compose logs peer-simulator
    exit 1
fi

echo -e "\n${GREEN}🎉 Peer simulator started successfully!${NC}"

# Show container status
echo -e "\n${BLUE}📊 Container Status:${NC}"
docker-compose ps

# Show peer information
echo -e "\n${BLUE}🤖 Peer Information:${NC}"
PEER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' orch-os-peer-simulator)
echo -e "   📍 Container IP: ${GREEN}$PEER_IP${NC}"
echo -e "   🌐 HTTP API: ${GREEN}http://localhost:3001${NC}"
echo -e "   🔗 Health Check: ${GREEN}http://localhost:3001/health${NC}"
echo -e "   📦 Adapters API: ${GREEN}http://localhost:3001/api/adapters${NC}"

# Test health endpoint
echo -e "\n${BLUE}🏥 Health Check:${NC}"
if curl -s http://localhost:3001/health | jq . 2>/dev/null; then
    echo -e "${GREEN}✅ Health check successful${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed, but container might still be starting${NC}"
fi

# Show adapter list
echo -e "\n${BLUE}📦 Available Adapters:${NC}"
if curl -s http://localhost:3001/api/adapters | jq -r '.[] | "   🎯 \(.name) (\(.size | . / 1024 / 1024 | floor)MB) - \(.metadata.base_model)"' 2>/dev/null; then
    echo -e "${GREEN}✅ Adapters loaded successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Could not fetch adapter list${NC}"
fi

# Show logs
echo -e "\n${BLUE}📜 Recent Logs:${NC}"
docker-compose logs --tail=10 peer-simulator

echo -e "\n${GREEN}🎯 Next Steps:${NC}"
echo -e "   1. Open Orch-OS application"
echo -e "   2. Go to Settings → Share tab"
echo -e "   3. Connect to 'Community' room"
echo -e "   4. You should see the peer simulator's adapters"
echo -e "   5. Try downloading an adapter to test P2P transfer"

echo -e "\n${BLUE}🛠️  Useful Commands:${NC}"
echo -e "   View logs: ${YELLOW}docker-compose logs -f peer-simulator${NC}"
echo -e "   Stop peer: ${YELLOW}docker-compose down${NC}"
echo -e "   Restart:   ${YELLOW}docker-compose restart peer-simulator${NC}"
echo -e "   Debug:     ${YELLOW}docker-compose up --profile debug${NC}"

echo -e "\n${GREEN}✨ Peer simulator is ready for testing!${NC}" 
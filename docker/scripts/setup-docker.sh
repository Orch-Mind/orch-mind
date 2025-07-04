#!/bin/bash

# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2025 Guilherme Ferrari Brescia

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Orch-OS Docker Setup Verification${NC}"
echo -e "${CYAN}Checking Docker environment for P2P testing...${NC}\n"

# Check if Docker is installed
echo -e "${YELLOW}1. Checking Docker Installation${NC}"
if command -v docker >/dev/null 2>&1; then
    docker_version=$(docker --version)
    echo -e "   ${GREEN}✅ Docker is installed: ${docker_version}${NC}"
else
    echo -e "   ${RED}❌ Docker is not installed${NC}"
    echo -e "\n${BLUE}📥 Install Docker:${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "   ${CYAN}macOS: Download Docker Desktop from https://docker.com/products/docker-desktop${NC}"
        echo -e "   ${CYAN}Or via Homebrew: brew install --cask docker${NC}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "   ${CYAN}Ubuntu/Debian: sudo apt-get update && sudo apt-get install docker.io${NC}"
        echo -e "   ${CYAN}CentOS/RHEL: sudo yum install docker${NC}"
        echo -e "   ${CYAN}Arch: sudo pacman -S docker${NC}"
    else
        echo -e "   ${CYAN}Windows: Download Docker Desktop from https://docker.com/products/docker-desktop${NC}"
    fi
    exit 1
fi

# Check if Docker Compose is available
echo -e "\n${YELLOW}2. Checking Docker Compose${NC}"
if command -v docker-compose >/dev/null 2>&1; then
    compose_version=$(docker-compose --version)
    echo -e "   ${GREEN}✅ Docker Compose is available: ${compose_version}${NC}"
elif docker compose version >/dev/null 2>&1; then
    compose_version=$(docker compose version)
    echo -e "   ${GREEN}✅ Docker Compose (plugin) is available: ${compose_version}${NC}"
    echo -e "   ${YELLOW}💡 Note: Use 'docker compose' instead of 'docker-compose'${NC}"
else
    echo -e "   ${RED}❌ Docker Compose is not available${NC}"
    echo -e "\n${BLUE}📥 Install Docker Compose:${NC}"
    echo -e "   ${CYAN}Usually included with Docker Desktop${NC}"
    echo -e "   ${CYAN}Linux: sudo apt-get install docker-compose-plugin${NC}"
    exit 1
fi

# Check if Docker daemon is running
echo -e "\n${YELLOW}3. Checking Docker Daemon${NC}"
if docker info >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Docker daemon is running${NC}"
    
    # Show Docker system info
    containers=$(docker ps -q | wc -l)
    images=$(docker images -q | wc -l)
    echo -e "   📊 Running containers: ${CYAN}$containers${NC}"
    echo -e "   📦 Available images: ${CYAN}$images${NC}"
else
    echo -e "   ${RED}❌ Docker daemon is not running${NC}"
    echo -e "\n${BLUE}🚀 Start Docker:${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "   ${CYAN}macOS: Open Docker Desktop application${NC}"
        echo -e "   ${CYAN}Or: open -a Docker${NC}"
        echo -e "   ${CYAN}Wait for Docker to start (whale icon in menu bar)${NC}"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "   ${CYAN}Linux: sudo systemctl start docker${NC}"
        echo -e "   ${CYAN}Enable on boot: sudo systemctl enable docker${NC}"
        echo -e "   ${CYAN}Add user to docker group: sudo usermod -aG docker \$USER${NC}"
        echo -e "   ${CYAN}Then logout and login again${NC}"
    else
        echo -e "   ${CYAN}Windows: Start Docker Desktop application${NC}"
    fi
    exit 1
fi

# Check Docker permissions
echo -e "\n${YELLOW}4. Checking Docker Permissions${NC}"
if docker ps >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Docker permissions are correct${NC}"
else
    echo -e "   ${RED}❌ Docker permission denied${NC}"
    echo -e "\n${BLUE}🔧 Fix Permissions:${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "   ${CYAN}Add user to docker group: sudo usermod -aG docker \$USER${NC}"
        echo -e "   ${CYAN}Then logout and login again${NC}"
        echo -e "   ${CYAN}Or start new shell: newgrp docker${NC}"
    else
        echo -e "   ${CYAN}Restart Docker Desktop application${NC}"
    fi
    exit 1
fi

# Check network connectivity
echo -e "\n${YELLOW}5. Checking Network Connectivity${NC}"
if docker run --rm alpine:latest ping -c 1 google.com >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Network connectivity is working${NC}"
else
    echo -e "   ${YELLOW}⚠️  Network connectivity test failed${NC}"
    echo -e "   ${CYAN}This might affect Docker image downloads${NC}"
fi

# Check available disk space
echo -e "\n${YELLOW}6. Checking Disk Space${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    available_space=$(df -h . | awk 'NR==2 {print $4}')
    echo -e "   📁 Available space: ${CYAN}$available_space${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    available_space=$(df -h . | awk 'NR==2 {print $4}')
    echo -e "   📁 Available space: ${CYAN}$available_space${NC}"
fi

# Check if ports are available
echo -e "\n${YELLOW}7. Checking Port Availability${NC}"
if ! lsof -i :3001 >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Port 3001 is available${NC}"
else
    echo -e "   ${YELLOW}⚠️  Port 3001 is in use${NC}"
    echo -e "   ${CYAN}Process using port 3001:${NC}"
    lsof -i :3001 | head -5
fi

if ! lsof -i :49737 >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Port 49737 is available${NC}"
else
    echo -e "   ${YELLOW}⚠️  Port 49737 is in use${NC}"
    echo -e "   ${CYAN}This is the default Hyperswarm P2P port${NC}"
fi

# Summary
echo -e "\n${BLUE}📋 Setup Summary${NC}"
echo -e "${GREEN}✅ Docker environment is ready for P2P testing!${NC}"

echo -e "\n${BLUE}🚀 Next Steps:${NC}"
echo -e "1. ${CYAN}Start the peer simulator:${NC}"
echo -e "   ${YELLOW}./docker/scripts/start-peer.sh${NC}"
echo -e ""
echo -e "2. ${CYAN}Run automated tests:${NC}"
echo -e "   ${YELLOW}./docker/scripts/test-p2p.sh${NC}"
echo -e ""
echo -e "3. ${CYAN}Test P2P in Orch-OS:${NC}"
echo -e "   - Open Orch-OS application"
echo -e "   - Go to Settings → Share tab"
echo -e "   - Connect to Community room"
echo -e "   - Verify peer adapters appear"

echo -e "\n${GREEN}🎉 Docker setup verification complete!${NC}" 
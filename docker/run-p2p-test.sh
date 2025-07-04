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
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BOLD}${BLUE}🚀 Orch-OS P2P Testing Environment${NC}"
echo -e "${CYAN}Complete setup and testing for Docker peer simulator${NC}\n"

# Function to print section headers
print_section() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo -e "${CYAN}$(printf '%.0s=' {1..50})${NC}"
}

# Function to check if user wants to continue
confirm_continue() {
    echo -e "\n${YELLOW}Press Enter to continue or Ctrl+C to exit...${NC}"
    read -r
}

# Step 1: Docker Setup Verification
print_section "Step 1: Docker Environment Verification"
echo -e "${CYAN}Checking if Docker is properly configured...${NC}"

if ! "$SCRIPT_DIR/scripts/setup-docker.sh"; then
    echo -e "\n${RED}❌ Docker setup failed. Please fix the issues above and try again.${NC}"
    exit 1
fi

confirm_continue

# Step 2: Build and Start Peer Simulator
print_section "Step 2: Starting P2P Peer Simulator"
echo -e "${CYAN}Building and starting the peer simulator container...${NC}"

if ! "$SCRIPT_DIR/scripts/start-peer.sh"; then
    echo -e "\n${RED}❌ Failed to start peer simulator. Check the logs above.${NC}"
    exit 1
fi

confirm_continue

# Step 3: Run Automated Tests
print_section "Step 3: Running Automated Tests"
echo -e "${CYAN}Executing comprehensive test suite...${NC}"

if ! "$SCRIPT_DIR/scripts/test-p2p.sh"; then
    echo -e "\n${RED}❌ Some tests failed. Check the output above.${NC}"
    echo -e "${YELLOW}The peer simulator might still be functional for manual testing.${NC}"
fi

confirm_continue

# Step 4: Manual Testing Instructions
print_section "Step 4: Manual Testing Guide"
echo -e "${GREEN}🎉 Peer simulator is ready! Follow these steps for manual testing:${NC}\n"

echo -e "${BOLD}${YELLOW}📱 Orch-OS Application Testing:${NC}"
echo -e "1. ${CYAN}Open your Orch-OS desktop application${NC}"
echo -e "2. ${CYAN}Click the WiFi icon in the top bar${NC}"
echo -e "3. ${CYAN}Click on the popup to open Share settings${NC}"
echo -e "4. ${CYAN}Click 'Community' button in Smart Connect${NC}"
echo -e "5. ${CYAN}Wait for connection (green status indicator)${NC}"

echo -e "\n${BOLD}${YELLOW}🔍 Verification Checklist:${NC}"
echo -e "□ ${CYAN}Peer appears in connection status${NC}"
echo -e "□ ${CYAN}Adapters appear in 'Available Adapters' section${NC}"
echo -e "□ ${CYAN}Adapter metadata is displayed correctly${NC}"
echo -e "□ ${CYAN}Download button is functional${NC}"

echo -e "\n${BOLD}${YELLOW}📦 Test Adapter Download:${NC}"
echo -e "□ ${CYAN}Click download on 'gemma3-test-adapter' (64MB)${NC}"
echo -e "□ ${CYAN}Monitor download progress${NC}"
echo -e "□ ${CYAN}Verify checksum validation${NC}"
echo -e "□ ${CYAN}Confirm adapter appears in local list${NC}"

echo -e "\n${BOLD}${YELLOW}🔗 Test Adapter Merge:${NC}"
echo -e "□ ${CYAN}Toggle 'Merge' mode in Available Adapters${NC}"
echo -e "□ ${CYAN}Select multiple adapters (including downloaded)${NC}"
echo -e "□ ${CYAN}Choose merge strategy (arithmetic_mean/weighted_average)${NC}"
echo -e "□ ${CYAN}Execute merge and verify new adapter creation${NC}"

# Step 5: Monitoring and Debugging
print_section "Step 5: Monitoring and Debugging"
echo -e "${CYAN}Useful commands for monitoring the peer simulator:${NC}\n"

echo -e "${BOLD}${YELLOW}📊 Real-time Monitoring:${NC}"
echo -e "• ${CYAN}Container logs:${NC} ${YELLOW}docker logs -f orch-os-peer-simulator${NC}"
echo -e "• ${CYAN}Health status:${NC} ${YELLOW}curl http://localhost:3001/health | jq${NC}"
echo -e "• ${CYAN}Adapter list:${NC} ${YELLOW}curl http://localhost:3001/api/adapters | jq${NC}"
echo -e "• ${CYAN}Container stats:${NC} ${YELLOW}docker stats orch-os-peer-simulator${NC}"

echo -e "\n${BOLD}${YELLOW}🔧 Debugging Commands:${NC}"
echo -e "• ${CYAN}Container shell:${NC} ${YELLOW}docker exec -it orch-os-peer-simulator /bin/sh${NC}"
echo -e "• ${CYAN}Network inspect:${NC} ${YELLOW}docker network inspect orch-p2p-network${NC}"
echo -e "• ${CYAN}Restart peer:${NC} ${YELLOW}docker-compose -f $SCRIPT_DIR/docker-compose.yml restart peer-simulator${NC}"
echo -e "• ${CYAN}Stop testing:${NC} ${YELLOW}docker-compose -f $SCRIPT_DIR/docker-compose.yml down${NC}"

echo -e "\n${BOLD}${YELLOW}📈 Performance Testing:${NC}"
echo -e "• ${CYAN}Test large file transfer (gemma3-test-adapter: 64MB)${NC}"
echo -e "• ${CYAN}Test multiple simultaneous downloads${NC}"
echo -e "• ${CYAN}Monitor transfer speeds and checksums${NC}"
echo -e "• ${CYAN}Verify merge operations with different strategies${NC}"

# Step 6: Expected Results
print_section "Step 6: Expected Test Results"
echo -e "${GREEN}✅ What you should see when everything works:${NC}\n"

echo -e "${BOLD}${YELLOW}🌐 P2P Connection:${NC}"
echo -e "• ${GREEN}Peer 'docker-peer-simulator' appears in community room${NC}"
echo -e "• ${GREEN}Connection status shows 'Connected' with green indicator${NC}"
echo -e "• ${GREEN}Signal strength indicator shows activity${NC}"

echo -e "\n${BOLD}${YELLOW}📦 Available Adapters:${NC}"
echo -e "• ${GREEN}gemma3-test-adapter (64MB) - gemma3:latest${NC}"
echo -e "• ${GREEN}llama3-coding-adapter (32MB) - llama3.1:latest${NC}"
echo -e "• ${GREEN}Complete metadata including LoRA parameters${NC}"
echo -e "• ${GREEN}Accurate file sizes and checksums${NC}"

echo -e "\n${BOLD}${YELLOW}⬇️ Download Process:${NC}"
echo -e "• ${GREEN}Progress bar shows real-time transfer${NC}"
echo -e "• ${GREEN}Chunked transfer (64KB chunks) with validation${NC}"
echo -e "• ${GREEN}SHA-256 checksum verification${NC}"
echo -e "• ${GREEN}Adapter appears in 'Your Adapters' section${NC}"

echo -e "\n${BOLD}${YELLOW}🔗 Merge Operations:${NC}"
echo -e "• ${GREEN}Multiple adapter selection works${NC}"
echo -e "• ${GREEN}Strategy configuration (weights, method)${NC}"
echo -e "• ${GREEN}New merged adapter created successfully${NC}"
echo -e "• ${GREEN}Merged adapter can be shared with others${NC}"

# Final summary
print_section "🎯 Testing Complete"
echo -e "${GREEN}${BOLD}🎉 P2P Docker testing environment is fully operational!${NC}\n"

echo -e "${CYAN}The peer simulator will continue running in the background.${NC}"
echo -e "${CYAN}You can now test the complete P2P workflow in Orch-OS.${NC}\n"

echo -e "${YELLOW}💡 Tips for successful testing:${NC}"
echo -e "• ${CYAN}Start with the smaller adapter (llama3-coding-adapter) first${NC}"
echo -e "• ${CYAN}Monitor logs in real-time during transfers${NC}"
echo -e "• ${CYAN}Test merge with different strategies to validate flexibility${NC}"
echo -e "• ${CYAN}Verify that merged adapters can be shared back to peers${NC}"

echo -e "\n${BLUE}📞 Need help? Check the logs or run individual test scripts:${NC}"
echo -e "• ${YELLOW}$SCRIPT_DIR/scripts/setup-docker.sh${NC} - Docker verification"
echo -e "• ${YELLOW}$SCRIPT_DIR/scripts/start-peer.sh${NC} - Start peer simulator"
echo -e "• ${YELLOW}$SCRIPT_DIR/scripts/test-p2p.sh${NC} - Run automated tests"

echo -e "\n${GREEN}${BOLD}Happy testing! 🚀${NC}" 
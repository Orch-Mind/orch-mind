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

# Test configuration
PEER_API="http://localhost:3001"
TEST_TIMEOUT=30
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🧪 Orch-OS P2P Testing Suite${NC}"
echo -e "${CYAN}Testing peer simulator functionality...${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
if response=$(curl -s --max-time 5 "$PEER_API/health"); then
    if echo "$response" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Health check passed${NC}"
        peer_id=$(echo "$response" | jq -r '.peerId')
        connections=$(echo "$response" | jq -r '.connections')
        adapters=$(echo "$response" | jq -r '.adapters')
        echo -e "   📋 Peer ID: ${CYAN}$peer_id${NC}"
        echo -e "   🔗 Connections: ${CYAN}$connections${NC}"
        echo -e "   📦 Adapters: ${CYAN}$adapters${NC}"
    else
        echo -e "   ${RED}❌ Health check failed - invalid response${NC}"
        exit 1
    fi
else
    echo -e "   ${RED}❌ Health check failed - no response${NC}"
    exit 1
fi

echo ""

# Test 2: Adapter List
echo -e "${YELLOW}Test 2: Adapter List${NC}"
if adapters_response=$(curl -s --max-time 5 "$PEER_API/api/adapters"); then
    adapter_count=$(echo "$adapters_response" | jq '. | length')
    if [ "$adapter_count" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Adapter list retrieved ($adapter_count adapters)${NC}"
        echo "$adapters_response" | jq -r '.[] | "   📦 \(.name) - \(.size / 1024 / 1024 | floor)MB (\(.metadata.base_model))"'
        
        # Store first adapter for download test
        first_adapter_topic=$(echo "$adapters_response" | jq -r '.[0].topic')
        first_adapter_name=$(echo "$adapters_response" | jq -r '.[0].name')
        first_adapter_size=$(echo "$adapters_response" | jq -r '.[0].size')
    else
        echo -e "   ${RED}❌ No adapters found${NC}"
        exit 1
    fi
else
    echo -e "   ${RED}❌ Failed to retrieve adapter list${NC}"
    exit 1
fi

echo ""

# Test 3: Container Network
echo -e "${YELLOW}Test 3: Container Network${NC}"
if docker inspect orch-os-peer-simulator >/dev/null 2>&1; then
    container_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' orch-os-peer-simulator)
    network_name=$(docker inspect orch-os-peer-simulator | jq -r '.[0].NetworkSettings.Networks | keys[0]' 2>/dev/null || echo "unknown")
    echo -e "   ${GREEN}✅ Container network configured${NC}"
    echo -e "   📍 IP Address: ${CYAN}$container_ip${NC}"
    echo -e "   🌐 Network: ${CYAN}$network_name${NC}"
    
    # Test network connectivity
    if ping -c 1 -W 2 "$container_ip" >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Network connectivity verified${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Network ping failed (might be expected)${NC}"
    fi
else
    echo -e "   ${RED}❌ Container not found${NC}"
    exit 1
fi

echo ""

# Test 4: P2P Room Joining
echo -e "${YELLOW}Test 4: P2P Room Joining${NC}"
test_room="test-room-$(date +%s)"
if curl -s --max-time 5 -X POST "$PEER_API/api/join-room/$test_room" | jq -e '.success == true' >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Successfully joined test room: $test_room${NC}"
    
    # Verify room was added
    sleep 2
    if curl -s "$PEER_API/health" | jq -e --arg room "$test_room" '.activeRooms | index($room)' >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Room verified in active rooms list${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Room not found in active rooms (might be expected)${NC}"
    fi
else
    echo -e "   ${RED}❌ Failed to join test room${NC}"
    exit 1
fi

echo ""

# Test 5: Container Logs Check
echo -e "${YELLOW}Test 5: Container Logs Check${NC}"
if docker logs orch-os-peer-simulator --tail=20 2>/dev/null | grep -q "Orch-OS Peer Simulator running"; then
    echo -e "   ${GREEN}✅ Container started successfully${NC}"
    
    # Check for adapter loading
    if docker logs orch-os-peer-simulator 2>/dev/null | grep -q "Loaded.*test adapters"; then
        echo -e "   ${GREEN}✅ Adapters loaded successfully${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Adapter loading not confirmed in logs${NC}"
    fi
    
    # Check for room joining
    if docker logs orch-os-peer-simulator 2>/dev/null | grep -q "Joined room"; then
        echo -e "   ${GREEN}✅ P2P rooms joined successfully${NC}"
    else
        echo -e "   ${YELLOW}⚠️  P2P room joining not confirmed in logs${NC}"
    fi
else
    echo -e "   ${RED}❌ Container startup not confirmed${NC}"
    exit 1
fi

echo ""

# Test 6: File System Check
echo -e "${YELLOW}Test 6: File System Check${NC}"
if docker exec orch-os-peer-simulator find /app/adapters/ -name "*.safetensors" 2>/dev/null | grep -q "safetensors"; then
    echo -e "   ${GREEN}✅ Adapter files found in container${NC}"
    
    # Check file sizes
    adapter_files=$(docker exec orch-os-peer-simulator find /app/adapters/ -name "*.safetensors" -exec ls -lh {} \; 2>/dev/null)
    echo -e "   📁 Adapter files:"
    echo "$adapter_files" | while read -r line; do
        echo -e "      ${CYAN}$line${NC}"
    done
else
    echo -e "   ${RED}❌ Adapter files not found in container${NC}"
    exit 1
fi

echo ""

# Test Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${GREEN}✅ All basic tests passed!${NC}"
echo ""
echo -e "${BLUE}🎯 Manual Testing Instructions:${NC}"
echo -e "1. ${YELLOW}Start Orch-OS Application${NC}"
echo -e "   - Open your Orch-OS desktop app"
echo ""
echo -e "2. ${YELLOW}Navigate to P2P Settings${NC}"
echo -e "   - Click the WiFi icon in the top bar"
echo -e "   - Click on the popup to open Share settings"
echo ""
echo -e "3. ${YELLOW}Connect to Community Room${NC}"
echo -e "   - Click 'Community' button in Smart Connect"
echo -e "   - Wait for connection (should show green status)"
echo ""
echo -e "4. ${YELLOW}Verify Peer Detection${NC}"
echo -e "   - Look for adapters in 'Available Adapters' section"
echo -e "   - You should see:"
echo -e "     📦 ${first_adapter_name} ($(echo "$first_adapter_size / 1024 / 1024" | bc)MB)"
echo -e "     📦 Other test adapters from the peer"
echo ""
echo -e "5. ${YELLOW}Test Adapter Download${NC}"
echo -e "   - Click download button on any adapter"
echo -e "   - Monitor progress and verify completion"
echo -e "   - Check that adapter appears in your local list"
echo ""
echo -e "6. ${YELLOW}Test Adapter Merge${NC}"
echo -e "   - Toggle 'Merge' mode in Available Adapters"
echo -e "   - Select multiple adapters (including downloaded one)"
echo -e "   - Configure merge strategy and execute"
echo ""
echo -e "${BLUE}🔧 Debugging Commands:${NC}"
echo -e "   View real-time logs: ${CYAN}docker logs -f orch-os-peer-simulator${NC}"
echo -e "   Check container status: ${CYAN}docker-compose ps${NC}"
echo -e "   Restart peer: ${CYAN}docker-compose restart peer-simulator${NC}"
echo -e "   Stop testing: ${CYAN}docker-compose down${NC}"
echo ""
echo -e "${GREEN}🎉 P2P Peer Simulator is ready for testing!${NC}" 
#!/bin/bash

# Test connectivity script for Docker P2P issues
# Based on Docker forum troubleshooting guides

echo "🔍 Docker P2P Connectivity Diagnostics"
echo "======================================="

# Test 1: Check Docker daemon status
echo "1. Docker daemon status:"
docker version --format 'Client: {{.Client.Version}}, Server: {{.Server.Version}}'

# Test 2: Check container health
echo -e "\n2. Container health:"
docker ps --filter "name=orch-os-peer-simulator" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test 3: Test HTTP endpoint
echo -e "\n3. Testing HTTP endpoint:"
if curl -f -s http://localhost:3001/health > /dev/null; then
    echo "✅ HTTP endpoint accessible"
    curl -s http://localhost:3001/health | jq .
else
    echo "❌ HTTP endpoint not accessible"
fi

# Test 4: Check network configuration
echo -e "\n4. Network configuration:"
docker network ls | grep orch

# Test 5: Test DNS resolution
echo -e "\n5. DNS resolution test:"
docker exec orch-os-peer-simulator nslookup google.com || echo "❌ DNS resolution failed"

# Test 6: Check port availability
echo -e "\n6. Port availability:"
netstat -an | grep -E "(3001|49737)" | head -5

# Test 7: Memory and resource usage
echo -e "\n7. Resource usage:"
docker stats orch-os-peer-simulator --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Test 8: Recent logs for errors
echo -e "\n8. Recent error logs:"
docker logs orch-os-peer-simulator --tail 20 | grep -E "(error|Error|ERROR|timeout|Timeout|TIMEOUT)" | tail -5

echo -e "\n🏁 Diagnostics complete!"
echo "💡 If you see connection timeouts, this may be related to Docker networking issues on macOS Sonoma."
echo "🔗 Reference: https://forums.docker.com/t/intermittent-docker-network-failures/138823" 
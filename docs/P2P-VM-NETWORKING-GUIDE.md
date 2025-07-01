# P2P Networking Guide for Virtual Machines (Parallels)

## Problem

When running Orch-OS in a VM (like Parallels on macOS), the P2P adapter sharing feature may not work properly in "Local Network" mode due to network isolation between the VM and host.

## Background

Orch-OS uses [Hyperswarm](https://github.com/hypercore-protocol/hyperswarm) for P2P connections, which relies on:
- **mDNS/Multicast** for local network discovery
- **DHT (Distributed Hash Table)** for global connections

Virtual machines often have network restrictions that prevent multicast/broadcast packets from crossing between VM and host.

## Known Parallels Limitations

### NAT (Shared Network) Mode
- **Default mode** in Parallels
- VM shares the host's IP address
- **Blocks multicast/mDNS traffic** between VM and host
- Prevents local P2P discovery
- Only allows outbound connections

### Why Local Discovery Fails
1. **Multicast isolation**: mDNS packets (port 5353) don't cross the NAT boundary
2. **Different subnets**: VM typically on 10.211.55.x, host on 192.168.x.x
3. **Firewall rules**: Parallels firewall may block peer-to-peer traffic
4. **Virtual network adapter**: Creates a separate network segment

## Solutions

### Option 1: Use Community Room (Recommended for Testing)

The easiest solution is to use the **Community/Global** room instead of Local:

1. In both instances (Mac and Windows VM), go to the **Share** tab
2. Use **Manual Mode** (toggle Smart → Manual)  
3. Click the **🌍 Community** button
4. Start sharing adapters - they should see each other immediately

**Why this works**: Community mode uses the DHT (global internet) instead of local mDNS, bypassing VM network isolation.

### Option 2: Configure Bridged Networking (Permanent Solution)

For local network discovery to work, configure Parallels to use **Bridged Networking**:

1. **Shut down the Windows VM completely**

2. **Open VM Configuration**:
   - Right-click the VM → **Configure**
   - Or: **Actions** menu → **Configure**

3. **Change Network Settings**:
   - Go to **Hardware** → **Network**
   - Change **Source** from:
     - ❌ **Shared Network** (NAT)
     - ✅ **Bridged Network: Default Adapter**
   
4. **Select Network Adapter**:
   - Choose your active network adapter (usually Wi-Fi or Ethernet)
   - If unsure, select **Default Adapter**

5. **Start the VM** - it will now get its own IP on your local network

6. **Verify Configuration**:
   ```powershell
   # In Windows VM
   ipconfig
   # Should show IP like 192.168.1.x (same subnet as Mac)
   ```

**Note**: Your router must support multiple DHCP clients. Most home routers do.

### Option 3: Use Private Rooms (Works with NAT)

Create a private room with a specific code:

1. In **Manual Mode**, enter a room code (e.g., `MYROOM123`)
2. Click **🔍 Join**
3. Share the code with the other instance
4. Both join the same code

This uses the global DHT with a specific topic, working around local network restrictions.

### Option 4: Port Forwarding (Advanced)

If you must use NAT mode with local discovery:

1. Configure port forwarding in Parallels for Hyperswarm ports
2. This is complex and not recommended

## Debugging Tips

### Check Network Configuration

In the Windows VM:
```powershell
# Check IP configuration
ipconfig /all

# Test connectivity to host
ping [host-ip]

# Check if on same subnet
# Host: 192.168.1.x
# VM should be: 192.168.1.y (not 10.211.55.x)
```

### Monitor P2P Logs

Open DevTools (F12) and check console for:
- `[P2P] Network interfaces:` - Shows detected network adapters
- `[P2P] Starting local network sharing...` - Local mode active
- `[P2P] No peers found after 5s` - Indicates network isolation

### Test Multicast

```powershell
# On Windows, test if multicast works
# This will fail in NAT mode
ping 224.0.0.251
```

## Summary

- **Quickest Solution**: Use Community mode (🌍) instead of Local (📡)
- **Best Solution**: Configure Bridged Networking in Parallels
- **Alternative**: Use private room codes

The issue is not with Orch-OS but with how VMs handle network isolation. These solutions work around those limitations.

## Additional Resources

- [Parallels Networking Guide](https://download.parallels.com/desktop/v18/docs/en_US/Parallels%20Desktop%20User's%20Guide/33013.htm)
- [Hyperswarm Documentation](https://github.com/hypercore-protocol/hyperswarm)
- [Understanding mDNS](https://en.wikipedia.org/wiki/Multicast_DNS) 
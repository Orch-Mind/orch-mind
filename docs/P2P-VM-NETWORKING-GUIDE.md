# P2P Networking Guide for Virtual Machines (Parallels)

## Problem

When running Orch-OS in a VM (like Parallels on macOS), the P2P adapter sharing feature may not work properly in "Local Network" mode due to network isolation between the VM and host.

## Background

Orch-OS uses [Hyperswarm](https://github.com/hypercore-protocol/hyperswarm) for P2P connections, which relies on:
- **mDNS/Multicast** for local network discovery
- **DHT (Distributed Hash Table)** for global connections

Virtual machines often have network restrictions that prevent multicast/broadcast packets from crossing between VM and host.

## Solutions

### Option 1: Use Community Room (Recommended for Testing)

The easiest solution is to use the **Community/Global** room instead of Local:

1. In both instances (Mac and Windows VM), go to the **Share** tab
2. Use **Manual Mode** (toggle from Smart to Manual)
3. Click **🌍 Community** button on both
4. Your adapters should now be visible to each other

### Option 2: Configure Parallels for Bridged Networking

To make Local Network discovery work between VM and host:

1. **Stop your Windows VM** in Parallels
2. Open Parallels Control Center
3. Right-click your Windows VM → **Configure**
4. Go to **Hardware** → **Network**
5. Change from **Shared Network** (NAT) to **Bridged Network**
6. Select **Default Adapter** or your active network interface
7. Start the VM

**Note:** Bridged mode puts the VM on the same network as your host, which may expose it to other devices on your network.

### Option 3: Use Private Rooms

Create a private room that both can join:

1. On the first instance (e.g., Mac):
   - Go to Share → Manual Mode
   - Leave the room code field empty
   - Click **🆕** to create a new room
   - Copy the generated room code (e.g., `PIZZA-123`)

2. On the second instance (e.g., Windows VM):
   - Go to Share → Manual Mode
   - Enter the room code
   - Click **🔍** to join

### Option 4: Port Forwarding (Advanced)

If you must use NAT mode, you can configure port forwarding:

1. In Parallels Configuration → **Network** → **Shared** → **Port Forwarding Rules**
2. Add rules for Hyperswarm ports:
   - Protocol: TCP/UDP
   - Source Port: 49737 (or range 49737-49837)
   - Destination: Your VM's IP
   - Destination Port: Same as source

**Note:** This is complex and may not work reliably for P2P discovery.

## Debugging

To debug P2P connections:

1. Open DevTools (F12) in both instances
2. Look for console logs starting with:
   - `[P2P-SERVICE]`
   - `[SMART-CONNECT]`
   - `[P2P]`

3. Check if peers are being detected:
   ```
   📡 [SMART-CONNECT] Peers detected: 0
   ```

4. If using Local mode shows "0 peers" after 3 seconds, the network discovery is blocked.

## Technical Details

- **Local Mode**: Uses mDNS (multicast DNS) on port 5353
- **Community Mode**: Uses DHT with bootstrap nodes
- **Smart Connect**: Tries Local for 3s, then falls back to Community

The issue with VMs is that multicast packets (224.0.0.0/4) often don't cross the VM boundary when using NAT mode.

## Additional Tips

1. **Windows Firewall**: Make sure Windows Firewall isn't blocking the Orch-OS app
2. **Antivirus**: Some antivirus software may block P2P connections
3. **VPN**: Disable VPN on both host and VM when testing
4. **Same Network**: For Local mode, both devices must be on the same subnet

## Still Having Issues?

If adapters still don't appear:

1. Try restarting both Orch-OS instances
2. Make sure you've clicked "Share" on the adapters you want to share
3. Check that both instances show "Connected" status
4. Use Community room as it's more reliable across network boundaries 
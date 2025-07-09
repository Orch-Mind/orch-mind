// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ipcMain } from "electron";
import { P2PCoordinator } from "./p2p/P2PCoordinator";

// Singleton instance
let p2pCoordinator: P2PCoordinator | null = null;

/**
 * Setup P2P IPC handlers following KISS principle
 * Simple API for renderer process communication
 */
export function setupP2PHandlers(): void {
  // Initialize P2P
  ipcMain.handle("p2p:initialize", async () => {
    try {
      if (!p2pCoordinator) {
        p2pCoordinator = new P2PCoordinator();
        await p2pCoordinator.initialize();
      }
      return { success: true };
    } catch (error) {
      console.error("[P2P] Initialization error:", error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Join room
  ipcMain.handle("p2p:joinRoom", async (_event, topic: string) => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      await p2pCoordinator.joinRoom(topic);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Create room
  ipcMain.handle("p2p:createRoom", async () => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      // Generate a random room topic following Pears pattern
      const crypto = require("crypto");
      const topicBuffer = crypto.randomBytes(32);
      const topic = topicBuffer.toString("hex");

      await p2pCoordinator.joinRoom(topic);
      return { success: true, topic };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Leave room
  ipcMain.handle("p2p:leaveRoom", async () => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      await p2pCoordinator.leaveRoom();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Share adapter
  ipcMain.handle("p2p:shareAdapter", async (_event, modelName: string) => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      const adapterInfo = await p2pCoordinator.shareAdapter(modelName);
      return { success: true, adapterInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Unshare adapter
  ipcMain.handle("p2p:unshareAdapter", async (_event, topic: string) => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      await p2pCoordinator.unshareAdapter(topic);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Request adapter
  ipcMain.handle(
    "p2p:requestAdapter",
    async (_event, data: { topic: string; fromPeer?: string }) => {
      try {
        if (!p2pCoordinator) throw new Error("P2P not initialized");
        await p2pCoordinator.requestAdapter(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // Check if adapter exists
  ipcMain.handle(
    "p2p:checkAdapterExists",
    async (_event, adapterName: string) => {
      try {
        if (!p2pCoordinator) {
          // If P2P is not initialized, we can still check for adapter existence
          const { AdapterRegistry } = require("./p2p/AdapterRegistry");
          const registry = new AdapterRegistry();
          const adapterPath = await registry.findModelPath(adapterName);
          return { success: adapterPath !== null };
        }

        // Use the coordinator's registry if available
        const adapterPath = await p2pCoordinator.checkAdapterExists(
          adapterName
        );
        return { success: adapterPath !== null };
      } catch (error) {
        console.error(
          `[P2P] Error checking adapter existence for ${adapterName}:`,
          error
        );
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // Broadcast adapters (for local UI updates)
  ipcMain.handle("p2p:broadcastAdapters", async (_event, adapters: any[]) => {
    try {
      if (!p2pCoordinator) throw new Error("P2P not initialized");
      // This is handled internally by the coordinator
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Send file (for file transfers)
  ipcMain.handle(
    "p2p:sendFile",
    async (
      _event,
      data: { peerId: string; filePath: string; metadata: any }
    ) => {
      try {
        if (!p2pCoordinator) throw new Error("P2P not initialized");
        // File transfer is handled by the coordinator internally
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // Destroy P2P
  ipcMain.handle("p2p:destroy", async () => {
    try {
      if (!p2pCoordinator) return { success: true };
      await p2pCoordinator.destroy();
      p2pCoordinator = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}

/**
 * Cleanup P2P before app exit
 */
export async function cleanupP2P(): Promise<void> {
  if (p2pCoordinator) {
    console.log("[P2P] Cleaning up before app exit...");
    await p2pCoordinator.destroy();
    p2pCoordinator = null;
  }
}

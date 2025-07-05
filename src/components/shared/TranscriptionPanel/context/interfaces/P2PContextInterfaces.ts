// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import {
  IncomingAdapter,
  SharedAdapter,
} from "../../components/settings/ShareSettings/types";
import { P2PGlobalStatus } from "../services/P2PConnectionService";

// ISP: Interface segregation - separate interfaces by domain

/**
 * Connection management interface
 * Handles P2P connection lifecycle
 */
export interface IP2PConnection {
  status: P2PGlobalStatus;
  connect: (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Auto-reconnection interface
 * Handles automatic reconnection logic
 */
export interface IP2PAutoReconnect {
  checkAndAutoReconnect: () => Promise<void>;
  reconnectToLastSession: () => Promise<void>;
  shouldShowReconnectPanel: () => boolean;
  isAutoRestoring: boolean;
}

/**
 * Persistence management interface
 * Handles state persistence and restoration
 */
export interface IP2PPersistence {
  persistedState: {
    lastConnectionType: "general" | "local" | "private" | null;
    lastRoomCode: string | null;
    sharedAdapterIds: string[];
    updateSharedAdapters: (adapterIds: string[]) => void;
    updateSelectedMode: (mode: "auto" | "manual") => void;
  };
  clearPersistedState: () => void;
}

/**
 * Adapter management interface
 * Handles local and incoming adapters
 */
export interface IP2PAdapterManagement {
  sharedAdapters: SharedAdapter[];
  incomingAdapters: IncomingAdapter[];
  loadLocalAdapters: () => void;
  toggleAdapterSharing: (index: number) => Promise<void>;
  downloadAdapter: (adapter: IncomingAdapter) => Promise<void>;
  clearIncomingAdapters: () => void;
  // Download progress interface
  downloadState: any;
  isDownloading: (adapterName: string) => boolean;
  getProgress: (adapterName: string) => any;
}

/**
 * Adapter synchronization interface
 * Handles filesystem and persistence sync
 */
export interface IP2PAdapterSync {
  syncLocalStorageWithFilesystem: () => Promise<void>;
  cleanupOrphanedAdapters: () => number;
}

/**
 * Event management interface
 * Handles adapter events subscription
 */
export interface IP2PEvents {
  onAdaptersAvailable: (callback: (adapters: any) => void) => void;
  offAdaptersAvailable: (callback: (adapters: any) => void) => void;
}

/**
 * Complete P2P context interface
 * Combines all interfaces for full functionality
 */
export interface P2PContextType
  extends IP2PConnection,
    IP2PAutoReconnect,
    IP2PPersistence,
    IP2PAdapterManagement,
    IP2PAdapterSync,
    IP2PEvents {}

/**
 * Minimal P2P context for components that only need connection status
 */
export interface P2PConnectionOnlyContext extends IP2PConnection {}

/**
 * Adapter-focused context for components that only manage adapters
 */
export interface P2PAdapterOnlyContext
  extends IP2PAdapterManagement,
    IP2PAdapterSync {}

/**
 * Event-focused context for components that only listen to events
 */
export interface P2PEventOnlyContext extends IP2PEvents {}

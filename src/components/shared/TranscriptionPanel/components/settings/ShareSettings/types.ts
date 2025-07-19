// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// ISP: Interface Segregation - interfaces específicas e focadas
export interface SharedAdapter {
  name: string;
  topic: string;
  size: string;
  shared: boolean;
  peers: number;
}

export interface IncomingAdapter {
  name: string;
  topic: string;
  size: string;
  from: string;
}

export interface P2PRoom {
  type: "general" | "local" | "private";
  code?: string;
  peersCount: number;
  isActive: boolean;
}

// ISP: Interfaces segregadas por responsabilidade
export interface ConnectionProps {
  onConnect: (
    type: "general" | "local" | "private",
    privateCode?: string
  ) => void;
  isLoading: boolean;
}

export interface PrivateRoomProps extends ConnectionProps {
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
}

export interface ConnectionStatusProps {
  currentRoom: P2PRoom | null;
  onDisconnect: () => void;
  isLoading: boolean;
  incomingAdapters?: IncomingAdapter[];
}

export interface AdapterListProps {
  adapters: SharedAdapter[];
  currentRoom: P2PRoom | null;
  onToggleSharing: (index: number) => void;
  isSharing: boolean;
}



// P2P Download Progress Types
export interface P2PDownloadProgress {
  adapterName: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  speed?: string; // e.g., "2.5 MB/s"
  eta?: string; // e.g., "30s", "2 min"
  status: "downloading" | "completed" | "error" | "cancelled";
  error?: string;
}

export interface P2PDownloadState {
  [adapterName: string]: P2PDownloadProgress;
}

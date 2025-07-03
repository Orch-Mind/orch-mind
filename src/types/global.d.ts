// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import type { ElectronAPI } from "./electron";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: unknown[]) => void) => void;
        removeListener: (
          channel: string,
          func: (...args: unknown[]) => void
        ) => void;
      };
    };
    ipcRenderer?: {
      on: (channel: string, func: (...args: unknown[]) => void) => void;
      removeListener: (
        channel: string,
        func: (...args: unknown[]) => void
      ) => void;
    };
    on?: (channel: string, func: (...args: unknown[]) => void) => void;
    removeListener?: (
      channel: string,
      func: (...args: unknown[]) => void
    ) => void;
    __LANGUAGE__: string;
    __ORCH_OS__?: boolean; // Marker for Orch-OS Electron environment
    signalMonitoringInterval: NodeJS.Timeout;
    audioSignalDetected: boolean;
  }
}

export {};

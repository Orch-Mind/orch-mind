// ModeService.ts — Orch-OS Mode Cortex
// Symbolic Intent: Central neuron for controlling Orch-OS operational mode (basic/advanced)
// Responsibilities: Exposes current mode, persists mode, notifies listeners, enforces symbolic clarity
// IMPORTANT: Use ModeService.getMode() to determine which AI backend to use in all services:
// - 'basic': Use HuggingFace (local models, no Deepgram, no Pinecone)
// - 'advanced': Use OpenAI/ChatGPT, Deepgram, Pinecone, full features

import { getOption, setOption } from './StorageService'; // Use symbolic storage neurons

// Symbolic enum for Orch-OS operational modes
export enum OrchOSModeEnum {
  BASIC = 'basic',
  ADVANCED = 'advanced'
}
export type OrchOSMode = OrchOSModeEnum.BASIC | OrchOSModeEnum.ADVANCED;

const MODE_STORAGE_KEY = 'orchos_mode';
const DEFAULT_MODE: OrchOSMode = OrchOSModeEnum.ADVANCED;

export class ModeService {
  // Internal state
  private static mode: OrchOSMode = DEFAULT_MODE;
  private static listeners: Array<(mode: OrchOSMode) => void> = [];
  private static initialized = false;

  // Initialize mode from storage or fallback
  static initialize() {
    if (this.initialized) return;
    let storedMode: OrchOSMode | null = null;
    try {
      // Attempt to retrieve mode from storage
      storedMode = getOption(MODE_STORAGE_KEY) as OrchOSMode | null;
    } catch (e) {
      // StorageService may not be ready; fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        // Fallback to localStorage if storage service is not available
        storedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as OrchOSMode | null;
      }
    }
    // Validate stored mode and update internal state
    if (storedMode === OrchOSModeEnum.BASIC || storedMode === OrchOSModeEnum.ADVANCED) {
      this.mode = storedMode;
    }
    this.initialized = true;
  }

  // Get current mode
  static getMode(): OrchOSMode {
    this.initialize();
    return this.mode;
  }

  // Set mode and notify listeners
  static setMode(mode: OrchOSMode) {
    if (this.mode !== mode) {
      this.mode = mode;
      try {
        setOption(MODE_STORAGE_KEY, mode);
      } catch (e) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(MODE_STORAGE_KEY, mode);
        }
      }
      this.listeners.forEach(listener => listener(mode));
    }
  }

  // Subscribe to mode changes
  static onModeChange(listener: (mode: OrchOSMode) => void) {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

// Symbolic: Ensure mode is initialized at startup
ModeService.initialize();

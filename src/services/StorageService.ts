// StorageService.ts
// Symbolic storage cortex for Orch-OS user settings (localStorage-based)
// Provides pure functions for saving and retrieving user config.

/**
 * Key used for storing user settings in localStorage.
 */
const USER_SETTINGS_KEY = 'orchos.user.settings';

// Symbolic: All user options are stored as a map/object in the selected storage cortex.
export type UserSettings = Record<string, any>;

// Storage backend abstraction
let backend: {
  get(): UserSettings;
  set(data: UserSettings): void;
} | null = null;

function isRenderer(): boolean {
  // Electron renderer or browser
  return (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined');
}

function getBackend() {
  if (backend) return backend;
  if (isRenderer()) {
    backend = {
      get: () => {
        const raw = window.localStorage.getItem(USER_SETTINGS_KEY);
        if (!raw) return {};
        try { return JSON.parse(raw) as UserSettings; } catch { return {}; }
      },
      set: (data: UserSettings) => {
        window.localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(data));
      }
    };
  } else {
    // Node.js/Electron main: use electron-store
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Store = require('electron-store').default;
    const store = new Store();
    backend = {
      get: () => store.get(USER_SETTINGS_KEY, {}),
      set: (data: UserSettings) => { store.set(USER_SETTINGS_KEY, data); }
    };
  }
  return backend;
}

/**
 * Saves all user settings (the entire map) to storage cortex.
 */
export function setAllOptions(options: UserSettings): void {
  getBackend().set(options);
}

/**
 * Retrieves all user settings (the entire map) from storage cortex.
 */
export function getAllOptions(): UserSettings {
  return getBackend().get();
}

/**
 * Sets a single option by key.
 */
export function setOption<T = any>(key: string, value: T): void {
  const options = getAllOptions();
  options[key] = value;
  setAllOptions(options);
}

/**
 * Gets a single option by key, or undefined if not set.
 */
export function getOption<T = any>(key: string): T | undefined {
  const options = getAllOptions();
  return options[key];
}

// Symbolic helpers for common options
export function getUserName(): string {
  return getOption<string>('name') || 'User';
}

export function setUserName(name: string): void {
  setOption('name', name);
}

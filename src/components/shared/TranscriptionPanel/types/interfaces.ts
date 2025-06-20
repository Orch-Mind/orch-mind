// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { ConnectionState, MicrophoneState } from "../../../context";

export interface TranscriptionPanelProps {
  onClose: () => void;
  width?: string;
}

export interface ConnectionDetailsType {
  [key: string]: unknown;
  active?: boolean;
  socketStatus?: string;
  socketReadyState?: number;
  sessionId?: string;
  error?: string;
}

export interface DiagnosticsPanelProps {
  connectionState: ConnectionState;
  microphoneState: MicrophoneState;
}

export interface ConnectionDiagnosticsProps {
  connectionDetails: ConnectionDetailsType | null;
  setConnectionDetails: React.Dispatch<React.SetStateAction<ConnectionDetailsType | null>>;
  getConnectionStatus: () => ConnectionDetailsType;
  showToast: (title: string, description: string, variant: "neutral" | "success" | "error") => void;
  disconnectFromDeepgram: () => Promise<void>;
  connectToDeepgram: () => Promise<boolean>;
  waitForConnectionState: (targetState: ConnectionState, timeoutMs: number) => Promise<boolean>;
  hasActiveConnection: () => boolean;
  ConnectionState: typeof ConnectionState;
}

export interface TextControlsProps {
  label: string;
  onClear: () => void;

  onExpand?: () => void;
}

export interface DeviceSelectorProps {
  devices: MediaDeviceInfo[];
  selectedId: string;
  onChange: (deviceId: string) => void;
  title: string;
  isSystemAudio: boolean;
}

export interface ToggleSwitchProps {
  label: string;
  isOn: boolean;
  onChange: () => void;
  title: string;
}

export interface AudioControlsProps {
  isMicrophoneOn: boolean;
  setIsMicrophoneOn: (isOn: boolean) => void;
  isSystemAudioOn: boolean;
  setIsSystemAudioOn: (isOn: boolean) => void;
  audioDevices: MediaDeviceInfo[];
  selectedDevices: {
    microphone: string | null;
    systemAudio: string | null;
  };
  handleDeviceChange: (deviceId: string, isSystemAudio: boolean) => void;
}

export interface TranscriptionTextsState {
  transcription: string;
  aiResponse: string;
}

export interface ImportModalProps {
  show: boolean;
  onClose: () => void;
  importFile: File | null;
  setImportFile: React.Dispatch<React.SetStateAction<File | null>>;
  importMode: ImportMode;
  setImportMode: React.Dispatch<React.SetStateAction<ImportMode>>;
  importProgress: number;
  importStage: string;
  importSummary: string;
  isImporting: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStartImport: () => Promise<void>;
  handleCloseImportModal: () => void;
}

// Define interfaces for import functionality using Interface Segregation Principle
export type ImportMode = 'overwrite' | 'increment';

export interface ImportProgressData {
  processed: number;
  total: number;
  percentage?: number;
  stage?: string;
}

// This interface is used internally in the ImportModal component
export interface ImportOptions {
  fileBuffer: ArrayBuffer | Buffer;
  mode: ImportMode;
  user: string;
  onProgress: (data: ImportProgressData) => void;
}

// Interface for the import service (Dependency Inversion Principle)
export interface IChatGptImportService {
  importChatHistory(options: {
    fileBuffer: ArrayBuffer | Buffer;
    mode: ImportMode;
    user: string;
    onProgress?: (data: ImportProgressData) => void;
  }): Promise<{ success: boolean; error?: string; imported?: number; skipped?: number }>;
}

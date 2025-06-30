// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

export interface OllamaModel {
  id: string;
  name: string;
  description: string;
  size?: string;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  downloadInfo?: DownloadInfo;
  category?: "main" | "embedding";
}

export interface DownloadInfo {
  progress: number;
  speed: string;
  eta: string;
  message?: string;
}

export interface OllamaSettingsProps {
  ollamaModel: string;
  setOllamaModel: (value: string) => void;
  ollamaEmbeddingModel: string;
  setOllamaEmbeddingModel: (value: string) => void;
  ollamaEnabled: boolean;
  setOllamaEnabled: (value: boolean) => void;
  storagePath?: string;
  setStoragePath?: (path: string) => void;
}

export interface OllamaApiResponse {
  models?: Array<{ name: string; id?: string }>;
  success?: boolean;

  path?: string;
}

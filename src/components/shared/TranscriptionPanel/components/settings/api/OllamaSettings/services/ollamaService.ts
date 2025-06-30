// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { OLLAMA_API_URLS } from "../constants/models.constants";

// Interface for real download progress
export interface OllamaDownloadProgress {
  modelId: string;
  progress: number;
  message: string;
  state: "downloading" | "error" | "idle";
}

// Type for progress callback
export type ProgressCallback = (progress: OllamaDownloadProgress) => void;

/**
 * Service responsible for all Ollama API communication
 * Single Responsibility: Handle API interactions
 */
export class OllamaService {
  // Track active downloads globally to prevent race conditions
  private static activeDownloads = new Set<string>();

  /**
   * Fetch installed models from Ollama
   */
  static async fetchInstalledModels(): Promise<string[]> {
    // NOTE: Removed the check that prevented fetching during downloads
    // as it was causing issues with the UI not updating properly
    // The race condition protection is now handled at a higher level

    try {
      console.log("[OllamaService] Fetching installed models...");

      // Try Electron API first - exactly as in original
      if (window.electronAPI?.listModels) {
        console.log("[OllamaService] Using Electron API to list models");
        const models = await window.electronAPI.listModels();
        if (models && Array.isArray(models)) {
          const installed = models.map((m) => m.name || m.id);
          console.log(
            `[OllamaService] Found ${installed.length} installed models via Electron:`,
            installed
          );
          return installed;
        }
      }

      // Fallback to HTTP API local do Ollama
      console.log("[OllamaService] Using HTTP API to list models");
      const response = await fetch(OLLAMA_API_URLS.LIST_MODELS);
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const installed = data.models.map((m: any) => m.name);
          console.log(
            `[OllamaService] Found ${installed.length} installed models via HTTP:`,
            installed
          );
          return installed;
        }
      } else {
        throw new Error("Ollama não está rodando ou não está acessível");
      }

      console.warn("[OllamaService] No models found");
      return [];
    } catch (error) {
      console.error("Erro ao carregar modelos instalados:", error);
      throw new Error(
        "Não foi possível conectar ao Ollama. Verifique se está rodando."
      );
    }
  }

  /**
   * Download a model from Ollama
   * Returns true if download completed (Electron API)
   * Returns false if fallback HTTP was used (needs progress simulation)
   * @param onProgress - Optional callback for real-time progress updates
   */
  static async downloadModel(
    modelId: string,
    onProgress?: (progress: number, speed: string, eta: string) => void
  ): Promise<boolean> {
    // Track this download as active
    this.activeDownloads.add(modelId);
    console.log(
      "[OllamaService] Download started, active downloads:",
      Array.from(this.activeDownloads)
    );

    try {
      // Tentar usar a API do Electron (Ollama) primeiro
      if (window.electronAPI?.downloadModel) {
        console.log(
          `[OllamaService] Attempting to download via Electron API: ${modelId}`
        );

        // Wrap the original onProgress to track completion
        const wrappedProgress = onProgress
          ? (progress: number, speed: string, eta: string) => {
              onProgress(progress, speed, eta);

              // Remove from active downloads when complete
              if (progress >= 100) {
                this.activeDownloads.delete(modelId);
                console.log(
                  "[OllamaService] Download completed, active downloads:",
                  Array.from(this.activeDownloads)
                );
              }
            }
          : undefined;

        const success = await window.electronAPI.downloadModel(
          modelId,
          wrappedProgress
        );

        if (success) {
          console.log(
            `[OllamaService] Download completed via Electron API: ${modelId}`
          );
          return true;
        } else {
          console.log(
            `[OllamaService] Electron API returned false, will use simulation: ${modelId}`
          );
        }
      }

      // Fallback para API HTTP do Ollama com simulação de progresso
      console.log(`[OllamaService] Attempting HTTP fallback for: ${modelId}`);
      const response = await fetch(OLLAMA_API_URLS.PULL_MODEL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelId,
          stream: false, // Como no código original
        }),
      });

      if (response.ok) {
        console.log(`[OllamaService] HTTP download initiated for: ${modelId}`);
      } else {
        console.warn(
          `[OllamaService] HTTP download failed with status: ${response.status}`
        );
      }

      // For simulation, caller will handle removing from active downloads
      // Sempre retorna false para iniciar simulação, mesmo se falhar
      // Isso é importante porque o Ollama pode não estar rodando
      return false;
    } catch (error) {
      console.error("Erro ao tentar conectar com Ollama:", error);
      // Remove from active downloads on error
      this.activeDownloads.delete(modelId);
      // Retorna false para permitir simulação mesmo sem Ollama
      return false;
    }
  }

  /**
   * Remove a model from active downloads
   * Used when simulation completes or is cancelled
   */
  static removeActiveDownload(modelId: string): void {
    this.activeDownloads.delete(modelId);
    console.log(
      "[OllamaService] Removed from active downloads:",
      modelId,
      "Remaining:",
      Array.from(this.activeDownloads)
    );
  }

  /**
   * Remove a model from Ollama
   */
  static async removeModel(modelId: string): Promise<void> {
    try {
      // Try Electron API first
      if (window.electronAPI?.removeModel) {
        await window.electronAPI.removeModel(modelId);
        return;
      }

      // Fallback to HTTP API
      const response = await fetch(OLLAMA_API_URLS.DELETE_MODEL, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove model");
      }
    } catch (error) {
      console.error("Error removing model:", error);
      throw error;
    }
  }

  /**
   * Select a directory using the system dialog
   */
  static async selectDirectory(): Promise<string | null> {
    try {
      if (window.electronAPI?.selectDirectory) {
        const result = await window.electronAPI.selectDirectory();
        if (result && result.success && result.path) {
          return result.path;
        }
      }
      return null;
    } catch (error) {
      console.error("Error selecting directory:", error);
      return null;
    }
  }
}

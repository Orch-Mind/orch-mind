// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing LoRA adapters - Following SRP
// Single responsibility: Handle LoRA adapters list and operations

import { getOption, STORAGE_KEYS } from "@services/StorageService";
import { useEffect, useState } from "react";
import { loadFromStorage, saveToStorage } from "../utils";

interface LoRAAdapter {
  id: string;
  name: string;
  baseModel: string;
  enabled: boolean;
  createdAt: string;
  status: "ready" | "training" | "error" | "downloaded" | "merged";
  source?: "local" | "p2p"; // Indica se foi treinado localmente ou baixado via P2P
  mergedWith?: string[]; // IDs dos adapters que foram mergeados
  downloadedFrom?: string; // Peer de origem se baixado via P2P
  displayName?: string; // Added for the new merge function
}

export const useLoRAAdapters = () => {
  const [adapters, setAdapters] = useState<LoRAAdapter[]>([]);
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Load LoRA adapters from localStorage
  useEffect(() => {
    const loadAdapters = () => {
      try {
        const trainingHistory = loadFromStorage("orch-lora-adapters", {
          adapters: [] as LoRAAdapter[],
        });
        const adapters = trainingHistory.adapters || [];
        console.log("[LoRA] Loaded adapters:", adapters);
        setAdapters(adapters);
      } catch (error) {
        console.error("[LoRA] Error loading adapters:", error);
      }
    };

    loadAdapters();
  }, []);

  // Load current base model from settings
  useEffect(() => {
    const loadBaseModel = () => {
      try {
        const currentModel = getOption(STORAGE_KEYS.OLLAMA_MODEL) || "";
        console.log("[LoRA] Loading current base model:", currentModel);
        setSelectedBaseModel(currentModel);
      } catch (error) {
        console.error("[LoRA] Error loading base model:", error);
        setSelectedBaseModel("");
      }
    };

    loadBaseModel();
  }, []);

  // Listen for adapter downloads from P2P
  useEffect(() => {
    const handleAdapterDownloaded = (event: CustomEvent) => {
      const { adapterId, adapterName, baseModel, downloadedFrom } =
        event.detail;
      console.log("[LoRA] Adapter downloaded via P2P:", {
        adapterId,
        adapterName,
        downloadedFrom,
      });

      addDownloadedAdapter(adapterId, baseModel, downloadedFrom, adapterName);
    };

    window.addEventListener(
      "adapter-downloaded",
      handleAdapterDownloaded as EventListener
    );

    return () => {
      window.removeEventListener(
        "adapter-downloaded",
        handleAdapterDownloaded as EventListener
      );
    };
  }, []);

  const saveAdapter = (adapterId: string, baseModel: string) => {
    try {
      const trainingHistory = loadFromStorage("orch-lora-adapters", {
        adapters: [] as LoRAAdapter[],
      });
      const adapters = trainingHistory.adapters || [];

      // Check if adapter already exists
      const existingAdapter = adapters.find((a) => a.id === adapterId);

      if (!existingAdapter) {
        // CRITICAL FIX: Use the exact same name that will be used in filesystem
        // The backend expects and saves adapters with "_adapter" suffix
        // So we need to ensure localStorage uses the same naming convention
        const filesystemAdapterName = adapterId.endsWith("_adapter")
          ? adapterId
          : `${adapterId}_adapter`;

        const newAdapter: LoRAAdapter = {
          id: adapterId, // Keep original ID for tracking
          name: filesystemAdapterName, // Use filesystem-compatible name
          baseModel: baseModel,
          enabled: false,
          createdAt: new Date().toISOString(),
          status: "ready",
          source: "local",
        };

        const updatedAdapters = [...adapters, newAdapter];
        trainingHistory.adapters = updatedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);
        setAdapters(updatedAdapters);
        console.log("[LoRA] Saved adapter with filesystem-compatible name:", {
          id: adapterId,
          name: filesystemAdapterName,
          baseModel: baseModel,
        });
      }
    } catch (error) {
      console.error("[LoRA] Error saving adapter:", error);
    }
  };

  const addDownloadedAdapter = (
    adapterId: string,
    baseModel: string,
    downloadedFrom: string,
    adapterName?: string
  ) => {
    try {
      const trainingHistory = loadFromStorage("orch-lora-adapters", {
        adapters: [] as LoRAAdapter[],
      });
      const adapters = trainingHistory.adapters || [];

      // Check if adapter already exists
      const existingAdapter = adapters.find((a) => a.id === adapterId);

      if (!existingAdapter) {
        // CRITICAL FIX: Ensure downloaded adapters also use filesystem-compatible names
        // Use the provided adapterName if available, otherwise generate from adapterId
        let filesystemAdapterName: string;

        if (adapterName) {
          // If adapterName is provided, ensure it has the _adapter suffix for filesystem compatibility
          filesystemAdapterName = adapterName.endsWith("_adapter")
            ? adapterName
            : `${adapterName}_adapter`;
        } else {
          // Fallback: generate name from adapterId
          filesystemAdapterName = adapterId.endsWith("_adapter")
            ? adapterId
            : `${adapterId}_downloaded_adapter`;
        }

        const newAdapter: LoRAAdapter = {
          id: adapterId, // Keep original ID for tracking
          name: filesystemAdapterName, // Use filesystem-compatible name
          baseModel: baseModel,
          enabled: false,
          createdAt: new Date().toISOString(),
          status: "downloaded",
          source: "p2p",
          downloadedFrom: downloadedFrom,
        };

        const updatedAdapters = [...adapters, newAdapter];
        trainingHistory.adapters = updatedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);
        setAdapters(updatedAdapters);
        console.log(
          "[LoRA] Added downloaded adapter with filesystem-compatible name:",
          {
            id: adapterId,
            name: filesystemAdapterName,
            downloadedFrom: downloadedFrom,
            baseModel: baseModel,
          }
        );
      }
    } catch (error) {
      console.error("[LoRA] Error adding downloaded adapter:", error);
    }
  };

  const deleteAdapter = async (
    adapterId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsDeleting(true);

    try {
      // Find the adapter being deleted to get its name for the event
      const adapterToDelete = adapters.find(
        (adapter) => adapter.id === adapterId
      );
      const adapterName = adapterToDelete?.name || adapterId;

      console.log(
        `🗑️ [LoRA Delete] Starting deletion for adapter: ${adapterId}`
      );
      console.log(`📋 [LoRA Delete] Adapter details:`, {
        name: adapterName,
        baseModel: adapterToDelete?.baseModel,
        status: adapterToDelete?.status,
        source: adapterToDelete?.source,
      });

      // CRITICAL FIX: Call electron backend to delete adapter files from filesystem
      if (window.electronAPI?.deleteAdapterFiles) {
        console.log(
          `🔧 [LoRA Delete] Calling backend to delete files for: ${adapterName}`
        );

        const deleteResult = await window.electronAPI.deleteAdapterFiles(
          adapterName
        );

        console.log(`📥 [LoRA Delete] Backend delete result:`, deleteResult);

        if (deleteResult.success) {
          console.log(
            `✅ [LoRA Delete] Successfully deleted filesystem files: ${deleteResult.message}`
          );
          console.log(
            `📊 [LoRA Delete] Deleted ${deleteResult.deletedDirs} directories and ${deleteResult.deletedFiles} files`
          );
        } else {
          console.warn(
            `⚠️ [LoRA Delete] Backend delete failed: ${deleteResult.error}`
          );
          // Continue with localStorage cleanup even if filesystem deletion fails
        }
      } else {
        console.warn(
          `⚠️ [LoRA Delete] Backend deleteAdapterFiles API not available`
        );
      }

      // Remove from local storage (always do this regardless of filesystem deletion result)
      const updatedAdapters = adapters.filter(
        (adapter) => adapter.id !== adapterId
      );
      setAdapters(updatedAdapters);

      // Update localStorage
      const trainingHistory = loadFromStorage("orch-lora-adapters", {
        adapters: [] as LoRAAdapter[],
      });
      trainingHistory.adapters = updatedAdapters;
      saveToStorage("orch-lora-adapters", trainingHistory);

      // Emit adapter deleted event to notify P2P system
      window.dispatchEvent(
        new CustomEvent("adapter-deleted", {
          detail: {
            adapterId: adapterId,
            adapterName: adapterName,
            wasP2P: adapterToDelete?.source === "p2p",
          },
        })
      );

      console.log(
        `✅ [LoRA Delete] Adapter deleted successfully from localStorage: ${adapterId}`
      );
      console.log(
        `📡 [LoRA Delete] Emitted adapter-deleted event for: ${adapterName}`
      );
      return { success: true };
    } catch (error) {
      console.error(`❌ [LoRA Delete] Error deleting adapter:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to save adapters to storage
  const saveAdaptersToStorage = (adaptersToSave: LoRAAdapter[]) => {
    const trainingHistory = loadFromStorage("orch-lora-adapters", {
      adapters: [] as LoRAAdapter[],
    });
    trainingHistory.adapters = adaptersToSave;
    saveToStorage("orch-lora-adapters", trainingHistory);
  };

  // Simplified enable/disable for UI state only (no complex backend operations)
  const toggleAdapterState = async (
    adapterId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    setIsToggling(true);

    try {
      // Update adapter status in localStorage
      const updatedAdapters = adapters.map(
        (adapter) =>
          adapter.id === adapterId
            ? { ...adapter, enabled }
            : enabled
            ? { ...adapter, enabled: false }
            : adapter // If enabling one, disable others
      );

      setAdapters(updatedAdapters);
      saveAdaptersToStorage(updatedAdapters);

      console.log(
        `[LoRA] Adapter ${adapterId} ${enabled ? "enabled" : "disabled"} in UI`
      );
      return { success: true };
    } catch (error) {
      console.error("[LoRA] Error toggling adapter state:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      setIsToggling(false);
    }
  };

  const mergeAdapters = async (
    adapterIds: string[],
    outputName: string,
    strategy:
      | "arithmetic_mean"
      | "weighted_average"
      | "svd_merge" = "arithmetic_mean",
    weights?: number[]
  ): Promise<{
    success: boolean;
    error?: string;
    mergedAdapterId?: string;
  }> => {
    try {
      if (adapterIds.length < 1) {
        return {
          success: false,
          error: "Pelo menos 1 adapter é necessário",
        };
      }

      // Caso especial: apenas 1 adapter - deploy direto
      if (adapterIds.length === 1) {
        const adapterId = adapterIds[0];
        const adapter = adapters.find((a) => a.id === adapterId);
        if (!adapter) {
          return { success: false, error: "Adapter não encontrado" };
        }

        // Deploy o adapter único
        const deployResult = await deployAdapter(adapterId);
        if (deployResult.success) {
          return {
            success: true,
            mergedAdapterId: adapterId,
          };
        } else {
          return {
            success: false,
            error: deployResult.error || "Falha no deploy do adapter único",
          };
        }
      }

      // Verificar se todos os adapters existem e têm o mesmo base model
      const selectedAdapters = adapters.filter((a) =>
        adapterIds.includes(a.id)
      );
      if (selectedAdapters.length !== adapterIds.length) {
        return {
          success: false,
          error: "Alguns adapters selecionados não foram encontrados",
        };
      }

      const baseModels = [...new Set(selectedAdapters.map((a) => a.baseModel))];
      if (baseModels.length > 1) {
        return {
          success: false,
          error: `Adapters têm base models incompatíveis: ${baseModels.join(
            ", "
          )}`,
        };
      }

      const baseModel = baseModels[0];
      const mergedAdapterId = `${outputName}_merged_${Date.now()}`;

      // Chamar o serviço de merge via Electron API
      if (!window.electronAPI?.mergeLoRAAdapters) {
        return { success: false, error: "API de merge não disponível" };
      }

      const mergeRequest = {
        adapters: selectedAdapters.map((adapter, index) => ({
          name: adapter.name,
          path: adapter.name, // Use adapter name for backend path resolution
          baseModel: adapter.baseModel,
          checksum: adapter.id, // Usar ID como checksum temporário
          weight: weights?.[index] || 1.0,
        })),
        strategy,
        outputName: mergedAdapterId,
        targetBaseModel: baseModel,
      };

      console.log(`🔗 [LoRA Merge] Starting merge with request:`, mergeRequest);

      const result = await window.electronAPI.mergeLoRAAdapters(mergeRequest);

      if (result.success) {
        // CRITICAL FIX: Use the correct adapter name that matches filesystem
        // The LoRAMergeService registers merged adapters with "_adapter" suffix in filesystem
        // We need to use this same name in localStorage for Share tab to find it
        const filesystemAdapterName = `${mergedAdapterId}_adapter`;

        console.log(`✅ [LoRA Merge] Merge completed successfully`);
        console.log(
          `📁 [LoRA Merge] Filesystem adapter name: ${filesystemAdapterName}`
        );
        console.log(`🔗 [LoRA Merge] Original output name: ${outputName}`);

        // Adicionar o adapter merged à lista usando o nome correto do filesystem
        const mergedAdapter: LoRAAdapter = {
          id: filesystemAdapterName, // Use filesystem name as ID
          name: filesystemAdapterName, // Use filesystem name to match AdapterRegistry
          baseModel: baseModel,
          enabled: false,
          createdAt: new Date().toISOString(),
          status: "merged",
          source: "local",
          mergedWith: adapterIds,
          // Store original output name for UI display
          displayName: outputName,
        };

        const updatedAdapters = [...adapters, mergedAdapter];
        const trainingHistory = loadFromStorage("orch-lora-adapters", {
          adapters: [] as LoRAAdapter[],
        });
        trainingHistory.adapters = updatedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);
        setAdapters(updatedAdapters);

        console.log(`📋 [LoRA Merge] Added merged adapter to localStorage:`, {
          id: mergedAdapter.id,
          name: mergedAdapter.name,
          displayName: mergedAdapter.displayName,
          baseModel: mergedAdapter.baseModel,
          status: mergedAdapter.status,
        });

        // Emit event to notify Share tab about new merged adapter
        window.dispatchEvent(
          new CustomEvent("adapter-merged", {
            detail: {
              adapterId: filesystemAdapterName,
              adapterName: filesystemAdapterName,
              displayName: outputName,
              baseModel: baseModel,
              source: "local-merge",
              mergedWith: adapterIds,
            },
          })
        );

        console.log(
          `📡 [LoRA Merge] Emitted adapter-merged event for Share tab`
        );

        return {
          success: true,
          mergedAdapterId: filesystemAdapterName, // Return filesystem name for consistency
        };
      } else {
        console.error(`❌ [LoRA Merge] Merge failed:`, result.error);
        return { success: false, error: result.error || "Falha no merge" };
      }
    } catch (error) {
      console.error("[LoRA] Merge error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  };

  const deployAdapter = async (
    adapterId: string,
    customModelName?: string
  ): Promise<{ success: boolean; error?: string; modelName?: string }> => {
    try {
      const adapter = adapters.find((a) => a.id === adapterId);
      if (!adapter) {
        return { success: false, error: "Adapter não encontrado" };
      }

      console.log(
        `🚀 [LoRA Deploy] Starting deployment for adapter: ${adapterId}`
      );
      console.log(`📋 [LoRA Deploy] Adapter details:`, {
        name: adapter.name,
        baseModel: adapter.baseModel,
        status: adapter.status,
        source: adapter.source,
      });

      // Verificar se a API de deploy está disponível
      if (!window.electronAPI?.deployLoRAAdapter) {
        return { success: false, error: "API de deploy não disponível" };
      }

      // Usar nome customizado ou gerar automaticamente seguindo convenções do Ollama
      const deployedModelName = customModelName || (() => {
        const baseModelClean = adapter.baseModel.replace(":", "-");
        const adapterNameClean = adapter.name.replace(/[^a-zA-Z0-9-_]/g, "-");
        return `${baseModelClean}-with-${adapterNameClean}:latest`;
      })();

      console.log(`🎯 [LoRA Deploy] Target model name: ${deployedModelName}`);

      // Preparar request de deploy seguindo o fluxo Unsloth
      const deployRequest = {
        adapterId: adapter.name, // CRITICAL FIX: Use adapter.name instead of adapterId for filesystem lookup
        adapterName: adapter.name,
        baseModel: adapter.baseModel,
        outputModelName: deployedModelName,
        deploymentType: "unsloth_gguf" as const, // Usar conversão GGUF conforme docs
        adapterPath: `/lora_adapters/registry/${adapter.name}`, // Use adapter.name for path resolution
      };

      console.log(`📤 [LoRA Deploy] Sending deploy request:`, deployRequest);

      // Executar deploy via Electron API
      const result = await window.electronAPI.deployLoRAAdapter(deployRequest);

      console.log(`📥 [LoRA Deploy] Deploy result:`, result);

      if (result.success) {
        // Atualizar adapter com informações de deploy
        const updatedAdapters = adapters.map(
          (a) =>
            a.id === adapterId
              ? {
                  ...a,
                  enabled: true,
                  deployedModel: deployedModelName,
                  status: "ready" as const,
                }
              : { ...a, enabled: false } // Desabilitar outros adapters
        );

        setAdapters(updatedAdapters);
        saveAdaptersToStorage(updatedAdapters);

        console.log(
          `✅ [LoRA Deploy] Successfully deployed: ${deployedModelName}`
        );

        return {
          success: true,
          modelName: deployedModelName,
        };
      } else {
        console.error(`❌ [LoRA Deploy] Deploy failed:`, result.error);
        return {
          success: false,
          error: result.error || "Falha no deploy do adapter",
        };
      }
    } catch (error) {
      console.error(`💥 [LoRA Deploy] Deploy error for ${adapterId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro no deploy",
      };
    }
  };

  const resetAdapters = () => {
    try {
      localStorage.removeItem("orch-lora-adapters");
      setAdapters([]);
      console.log("[LoRA] Adapters reset completed");
    } catch (error) {
      console.error("[LoRA] Error resetting adapters:", error);
    }
  };

  // MIGRATION FUNCTION: Fix adapter names to be filesystem-compatible
  const migrateAdapterNames = () => {
    try {
      const trainingHistory = loadFromStorage("orch-lora-adapters", {
        adapters: [] as LoRAAdapter[],
      });
      const adapters = trainingHistory.adapters || [];

      let migrationCount = 0;
      const migratedAdapters = adapters.map((adapter) => {
        // Check if adapter name needs migration (doesn't end with _adapter)
        if (!adapter.name.endsWith("_adapter")) {
          migrationCount++;
          const migratedName = `${adapter.name}_adapter`;
          console.log(
            `[LoRA] Migrating adapter name: ${adapter.name} → ${migratedName}`
          );

          return {
            ...adapter,
            name: migratedName,
          };
        }
        return adapter;
      });

      if (migrationCount > 0) {
        trainingHistory.adapters = migratedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);
        setAdapters(migratedAdapters);
        console.log(
          `[LoRA] Migration completed: ${migrationCount} adapters migrated to filesystem-compatible names`
        );
        return { success: true, migrated: migrationCount };
      } else {
        console.log("[LoRA] No adapters need migration");
        return { success: true, migrated: 0 };
      }
    } catch (error) {
      console.error("[LoRA] Error during adapter name migration:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    adapters,
    selectedBaseModel,
    isDeleting,
    isToggling,
    saveAdapter,
    addDownloadedAdapter,
    deleteAdapter,
    toggleAdapterState,
    mergeAdapters,
    deployAdapter,
    resetAdapters,
    migrateAdapterNames, // New migration function
    setSelectedBaseModel,
  };
};

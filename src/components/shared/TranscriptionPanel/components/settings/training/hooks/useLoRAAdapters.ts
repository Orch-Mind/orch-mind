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
        const newAdapter: LoRAAdapter = {
          id: adapterId,
          name: `${adapterId}_adapter`,
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
        console.log("[LoRA] Saved adapter:", adapterId);
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
        const newAdapter: LoRAAdapter = {
          id: adapterId,
          name: adapterName || `${adapterId}_downloaded`,
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
          "[LoRA] Added downloaded adapter:",
          adapterId,
          "from:",
          downloadedFrom
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
      // Call electron to delete adapter (if needed)
      // For now, just remove from local storage
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

      console.log("[LoRA] Adapter deleted successfully:", adapterId);
      return { success: true };
    } catch (error) {
      console.error("[LoRA] Error deleting adapter:", error);
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
          path: `/adapters/${adapter.id}`, // Path será resolvido pelo backend
          baseModel: adapter.baseModel,
          checksum: adapter.id, // Usar ID como checksum temporário
          weight: weights?.[index] || 1.0,
        })),
        strategy,
        outputName: mergedAdapterId,
        targetBaseModel: baseModel,
      };

      const result = await window.electronAPI.mergeLoRAAdapters(mergeRequest);

      if (result.success) {
        // Adicionar o adapter merged à lista
        const mergedAdapter: LoRAAdapter = {
          id: mergedAdapterId,
          name: outputName,
          baseModel: baseModel,
          enabled: false,
          createdAt: new Date().toISOString(),
          status: "merged",
          source: "local",
          mergedWith: adapterIds,
        };

        const updatedAdapters = [...adapters, mergedAdapter];
        const trainingHistory = loadFromStorage("orch-lora-adapters", {
          adapters: [] as LoRAAdapter[],
        });
        trainingHistory.adapters = updatedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);
        setAdapters(updatedAdapters);

        console.log("[LoRA] Merge completed:", mergedAdapterId);
        return { success: true, mergedAdapterId };
      } else {
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
    targetModel?: string
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

      // Criar nome do modelo seguindo convenções do Ollama
      const baseModelClean = adapter.baseModel.replace(":", "-");
      const adapterNameClean = adapter.name.replace(/[^a-zA-Z0-9-_]/g, "-");
      const deployedModelName = `${baseModelClean}-with-${adapterNameClean}:latest`;

      console.log(`🎯 [LoRA Deploy] Target model name: ${deployedModelName}`);

      // Preparar request de deploy seguindo o fluxo Unsloth
      const deployRequest = {
        adapterId: adapterId,
        adapterName: adapter.name,
        baseModel: adapter.baseModel,
        outputModelName: deployedModelName,
        deploymentType: "unsloth_gguf" as const, // Usar conversão GGUF conforme docs
        adapterPath: `/lora_adapters/registry/${adapterId}`, // Path será resolvido pelo backend
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
    setSelectedBaseModel,
  };
};

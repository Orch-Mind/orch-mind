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
  status: "ready" | "training" | "error";
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

  const enableAdapter = async (
    adapterId: string
  ): Promise<{
    success: boolean;
    error?: string;
    activeModel?: string;
    validationStatus?: string;
  }> => {
    setIsToggling(true);

    try {
      console.log(
        "[LoRA] Enabling adapter with REAL merge and validation:",
        adapterId
      );

      // Call the real adapter manager script
      if (!window.electronAPI?.trainLoRAAdapter) {
        console.error("[LoRA] Electron API not available");
        return { success: false, error: "Electron API not available" };
      }

      // Use the training API to call the real adapter manager
      const result = await window.electronAPI.trainLoRAAdapter({
        conversations: [], // Not needed for enable
        baseModel: "", // Not needed for enable
        outputName: adapterId,
        action: "enable_real_adapter",
      });

      if (result.success) {
        // Update local state
        const updatedAdapters = adapters.map(
          (adapter) =>
            adapter.id === adapterId
              ? {
                  ...adapter,
                  enabled: true,
                  lastEnabled: new Date().toISOString(),
                }
              : { ...adapter, enabled: false } // Disable others
        );
        setAdapters(updatedAdapters);
        saveAdaptersToStorage(updatedAdapters);

        // Extract active model from result details
        const activeModel =
          result.details?.activeModel || result.details?.adapterId;

        // Check if we have validation confirmation
        const hasValidation =
          result.details?.validationStatus === "passed" ||
          result.details?.hasRealWeights === true ||
          (result.details && result.details.toString().includes("VERIFIED"));

        return {
          success: true,
          activeModel,
          validationStatus: hasValidation ? "verified_real_weights" : "unknown",
        };
      } else {
        // Analyze error for specific failure types
        const errorMsg = result.error || "Unknown error";

        if (
          errorMsg.includes("validation failed") ||
          errorMsg.includes("no real weights detected")
        ) {
          return {
            success: false,
            error:
              "🚨 VALIDATION FAILED: Adapter merge failed validation - no real weights detected. This prevents creating a fake model.",
            validationStatus: "validation_failed",
          };
        } else if (errorMsg.includes("GGUF conversion failed")) {
          return {
            success: false,
            error:
              "🔧 CONVERSION FAILED: Unable to convert merged model to Ollama format. Check dependencies (torch, transformers, peft).",
            validationStatus: "conversion_failed",
          };
        } else if (errorMsg.includes("no cosmetic fallback created")) {
          return {
            success: false,
            error:
              "🛡️ SAFETY CHECK: Real merge failed, cosmetic fallback was intentionally blocked to prevent silent failure.",
            validationStatus: "safety_block",
          };
        } else {
          return {
            success: false,
            error: `❌ Real adapter enable failed: ${errorMsg}`,
            validationStatus: "unknown_error",
          };
        }
      }
    } catch (error) {
      console.error("[LoRA] Enable adapter error:", error);
      return {
        success: false,
        error: `❌ Real adapter enable failed: ${error}`,
        validationStatus: "exception",
      };
    } finally {
      setIsToggling(false);
    }
  };

  const disableAdapter = async (
    adapterId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsToggling(true);

    try {
      console.log("[LoRA] Disabling adapter:", adapterId);

      // Call the real adapter manager script
      if (!window.electronAPI?.trainLoRAAdapter) {
        console.error("[LoRA] Electron API not available");
        return { success: false, error: "Electron API not available" };
      }

      // Use the training API to call the real adapter manager
      const result = await window.electronAPI.trainLoRAAdapter({
        conversations: [], // Not needed for disable
        baseModel: "", // Not needed for disable
        outputName: adapterId,
        action: "disable_real_adapter", // Special action for real adapter disabling
      });

      if (result.success) {
        // Update adapter status to disabled
        const updatedAdapters = adapters.map((adapter) =>
          adapter.id === adapterId ? { ...adapter, enabled: false } : adapter
        );

        setAdapters(updatedAdapters);

        // Update localStorage
        const trainingHistory = loadFromStorage("orch-lora-adapters", {
          adapters: [] as LoRAAdapter[],
        });
        trainingHistory.adapters = updatedAdapters;
        saveToStorage("orch-lora-adapters", trainingHistory);

        console.log("[LoRA] Adapter disabled:", adapterId);
        return { success: true };
      } else {
        console.error("[LoRA] Failed to disable adapter:", result.error);
        return {
          success: false,
          error: result.error || "Failed to disable adapter",
        };
      }
    } catch (error) {
      console.error("[LoRA] Error disabling adapter:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    } finally {
      setIsToggling(false);
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
    deleteAdapter,
    enableAdapter,
    disableAdapter,
    resetAdapters,
    setSelectedBaseModel,
  };
};

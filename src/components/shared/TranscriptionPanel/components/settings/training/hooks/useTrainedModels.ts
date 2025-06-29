// SPDX-License-Identifier: MIT OR Apache-2.0
// Hook for managing trained models - Following SRP
// Single responsibility: Handle trained models list and operations

import { getOption, setOption, STORAGE_KEYS } from "@services/StorageService";
import { useEffect, useState } from "react";
import { loadFromStorage, saveToStorage } from "../utils";

export const useTrainedModels = () => {
  const [trainedModels, setTrainedModels] = useState<string[]>([]);
  const [selectedBaseModel, setSelectedBaseModel] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load trained models from localStorage
  useEffect(() => {
    const loadTrainedModels = () => {
      try {
        const trainingHistory = loadFromStorage("orch-training-history", {
          trainedModels: [] as string[],
        });
        const models = trainingHistory.trainedModels || [];
        console.log("[Training] Loaded trained models:", models);
        setTrainedModels(models);
      } catch (error) {
        console.error("[Training] Error loading trained models:", error);
      }
    };

    loadTrainedModels();
  }, []);

  // Load current base model from settings
  useEffect(() => {
    const loadBaseModel = () => {
      try {
        const currentModel = getOption(STORAGE_KEYS.OLLAMA_MODEL) || "";
        console.log("[Training] Loading current base model:", currentModel);
        setSelectedBaseModel(currentModel);
      } catch (error) {
        console.error("[Training] Error loading base model:", error);
        setSelectedBaseModel("");
      }
    };

    loadBaseModel();
  }, []);

  const saveTrainedModel = (modelName: string) => {
    try {
      const trainingHistory = loadFromStorage("orch-training-history", {
        trainedModels: [] as string[],
      });
      const models = trainingHistory.trainedModels || [];

      if (!models.includes(modelName)) {
        const updatedModels = [...models, modelName];
        trainingHistory.trainedModels = updatedModels;
        saveToStorage("orch-training-history", trainingHistory);
        setTrainedModels(updatedModels);
        console.log("[Training] Saved trained model:", modelName);
      }
    } catch (error) {
      console.error("[Training] Error saving trained model:", error);
    }
  };

  const deleteModel = async (
    modelName: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsDeleting(true);

    try {
      // Call electron to delete model from Ollama
      if (!window.electronAPI || !window.electronAPI.deleteOllamaModel) {
        throw new Error("Delete model function not available");
      }

      const result = await (window.electronAPI.deleteOllamaModel as any)(
        modelName
      );

      // Check if model was successfully deleted OR if it didn't exist (both are acceptable)
      const isModelNotFound =
        result?.error?.includes("not found") ||
        result?.error?.includes("Error: model");
      const shouldProceedWithCleanup = result?.success || isModelNotFound;

      if (shouldProceedWithCleanup) {
        // Remove from trained models list (even if model didn't exist in Ollama)
        const updatedModels = trainedModels.filter(
          (model) => model !== modelName
        );
        setTrainedModels(updatedModels);

        // Update localStorage
        const trainingHistory = loadFromStorage("orch-training-history", {
          trainedModels: [] as string[],
        });
        trainingHistory.trainedModels = updatedModels;
        saveToStorage("orch-training-history", trainingHistory);

        // If deleted model was active, clear it
        if (selectedBaseModel === modelName) {
          setSelectedBaseModel("");
        }

        if (isModelNotFound) {
          console.log(
            "[Training] Model not found in Ollama, removed from local list:",
            modelName
          );
        } else {
          console.log("[Training] Model deleted successfully:", modelName);
        }
        return { success: true };
      } else {
        throw new Error(result?.error || "Failed to delete model");
      }
    } catch (error) {
      console.error("[Training] Error deleting model:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // If it's a "not found" error, treat as success and clean up locally
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("Error: model")
      ) {
        const updatedModels = trainedModels.filter(
          (model) => model !== modelName
        );
        setTrainedModels(updatedModels);

        const trainingHistory = loadFromStorage("orch-training-history", {
          trainedModels: [] as string[],
        });
        trainingHistory.trainedModels = updatedModels;
        saveToStorage("orch-training-history", trainingHistory);

        console.log(
          "[Training] Model not found, cleaned from local list:",
          modelName
        );
        return { success: true };
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  };

  const activateModel = async (
    modelName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Update the current model setting using StorageService
      setOption(STORAGE_KEYS.OLLAMA_MODEL, modelName);
      setSelectedBaseModel(modelName);

      console.log("[Training] Model activated:", modelName);
      return { success: true };
    } catch (error) {
      console.error("[Training] Error activating model:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  };

  const resetTrainedModels = () => {
    try {
      localStorage.removeItem("orch-training-history");
      setTrainedModels([]);
      console.log("[Training] Trained models reset completed");
    } catch (error) {
      console.error("[Training] Error resetting trained models:", error);
    }
  };

  return {
    trainedModels,
    selectedBaseModel,
    isDeleting,
    saveTrainedModel,
    deleteModel,
    activateModel,
    resetTrainedModels,
    setSelectedBaseModel,
  };
};

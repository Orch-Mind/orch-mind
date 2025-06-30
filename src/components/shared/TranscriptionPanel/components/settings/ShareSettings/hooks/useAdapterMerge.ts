// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useEffect, useState } from "react";
import {
  IAdapterForMerge,
  IMergedAdapterInfo,
  IMergeRequest,
  IMergeStrategy,
} from "../utils/AdapterMergeTypes";
import { MergeValidationUtils } from "../utils/MergeValidationUtils";
import { NotificationUtils } from "../utils/NotificationUtils";

// SRP: Hook focused only on merge logic and state management
export const useAdapterMerge = (adapters: any[]) => {
  const [availableForMerge, setAvailableForMerge] = useState<
    IAdapterForMerge[]
  >([]);
  const [mergedAdapters, setMergedAdapters] = useState<IMergedAdapterInfo[]>(
    []
  );
  const [selectedStrategy, setSelectedStrategy] =
    useState<IMergeStrategy["value"]>("arithmetic_mean");
  const [outputName, setOutputName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // DRY: Load available adapters for merging
  useEffect(() => {
    const adaptersForMerge: IAdapterForMerge[] = adapters.map((adapter) => ({
      name: adapter.name,
      path: `/tmp/downloaded/${adapter.topic}`,
      baseModel: "llama3.1:latest", // Should be extracted from adapter metadata
      checksum: "pending",
      weight: 1.0,
      selected: false,
      from: adapter.from,
    }));
    setAvailableForMerge(adaptersForMerge);
  }, [adapters]);

  // Load merged adapters on mount
  useEffect(() => {
    loadMergedAdapters();
  }, []);

  // SRP: Load merged adapters
  const loadMergedAdapters = useCallback(async () => {
    if (!window.electronAPI || !("listMergedAdapters" in window.electronAPI))
      return;

    try {
      const result = await (window.electronAPI as any).listMergedAdapters();
      if (result.success) {
        setMergedAdapters(result.adapters);
      }
    } catch (error) {
      console.error("Error loading merged adapters:", error);
    }
  }, []);

  // DRY: Use validation utils
  const handleAdapterSelection = useCallback((index: number) => {
    setAvailableForMerge((prev) =>
      MergeValidationUtils.toggleAdapterSelection(prev, index)
    );
  }, []);

  // DRY: Use validation utils
  const handleWeightChange = useCallback((index: number, weight: number) => {
    setAvailableForMerge((prev) =>
      MergeValidationUtils.updateAdapterWeight(prev, index, weight)
    );
  }, []);

  // KISS: Simple merge logic
  const handleMergeAdapters = useCallback(async () => {
    if (!window.electronAPI || !("mergeLoRAAdapters" in window.electronAPI)) {
      NotificationUtils.showError("Funcionalidade de fusão não disponível");
      return;
    }

    // DRY: Use centralized validation
    const validationError = MergeValidationUtils.validateMergeRequest(
      availableForMerge,
      outputName
    );

    if (validationError) {
      NotificationUtils.showError(validationError);
      return;
    }

    const selectedAdapters = availableForMerge.filter((a) => a.selected);
    setIsLoading(true);

    try {
      const mergeRequest: IMergeRequest = {
        adapters: selectedAdapters.map((adapter) => ({
          name: adapter.name,
          path: adapter.path,
          baseModel: adapter.baseModel,
          checksum: adapter.checksum,
          weight:
            selectedStrategy === "weighted_average"
              ? adapter.weight
              : undefined,
        })),
        strategy: selectedStrategy,
        outputName: outputName.trim(),
        targetBaseModel: selectedAdapters[0].baseModel,
      };

      console.log("🔄 Starting adapter merge:", mergeRequest);

      const result = await (window.electronAPI as any).mergeLoRAAdapters(
        mergeRequest
      );

      if (result.success) {
        NotificationUtils.showSuccess(
          `✅ Fusão concluída: ${outputName}! Adapter merged criado com ${selectedAdapters.length} fontes.`
        );

        // Reset form
        resetMergeForm();
        await loadMergedAdapters();
      } else {
        throw new Error(result.error || "Falha na fusão de adapters");
      }
    } catch (error) {
      console.error("❌ Merge failed:", error);
      NotificationUtils.showError(
        `Erro na fusão: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }, [availableForMerge, selectedStrategy, outputName, loadMergedAdapters]);

  // KISS: Simple reset function
  const resetMergeForm = useCallback(() => {
    setOutputName("");
    setAvailableForMerge((prev) =>
      prev.map((a) => ({ ...a, selected: false, weight: 1.0 }))
    );
  }, []);

  // SRP: Handle merged adapter sharing
  const handleShareMergedAdapter = useCallback(async (adapterName: string) => {
    if (!window.electronAPI || !("shareMergedAdapter" in window.electronAPI))
      return;

    try {
      const result = await (window.electronAPI as any).shareMergedAdapter(
        adapterName
      );
      if (result.success) {
        NotificationUtils.showSuccess(
          `🌐 Adapter merged "${adapterName}" compartilhado na rede P2P!`
        );
      } else {
        throw new Error(result.error || "Falha ao compartilhar adapter");
      }
    } catch (error) {
      NotificationUtils.showError(
        `Erro ao compartilhar: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  }, []);

  // SRP: Handle merged adapter removal
  const handleRemoveMergedAdapter = useCallback(
    async (adapterName: string) => {
      if (!window.electronAPI || !("removeMergedAdapter" in window.electronAPI))
        return;
      if (
        !confirm(
          `Tem certeza que deseja remover o adapter merged "${adapterName}"?`
        )
      )
        return;

      try {
        const result = await (window.electronAPI as any).removeMergedAdapter(
          adapterName
        );
        if (result.success) {
          NotificationUtils.showSuccess(`🗑️ Adapter "${adapterName}" removido`);
          await loadMergedAdapters();
        } else {
          throw new Error(result.error || "Falha ao remover adapter");
        }
      } catch (error) {
        NotificationUtils.showError(
          `Erro ao remover: ${
            error instanceof Error ? error.message : "Erro desconhecido"
          }`
        );
      }
    },
    [loadMergedAdapters]
  );

  // KISS: Simple computed values
  const selectedCount = availableForMerge.filter((a) => a.selected).length;
  const canMerge =
    selectedCount >= 2 && outputName.trim().length > 0 && !isLoading;

  return {
    availableForMerge,
    mergedAdapters,
    selectedStrategy,
    setSelectedStrategy,
    outputName,
    setOutputName,
    isLoading,
    selectedCount,
    canMerge,
    handleAdapterSelection,
    handleWeightChange,
    handleMergeAdapters,
    handleShareMergedAdapter,
    handleRemoveMergedAdapter,
  };
};

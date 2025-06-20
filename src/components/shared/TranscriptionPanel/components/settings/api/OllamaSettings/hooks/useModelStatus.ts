// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState } from "react";
import { OllamaService } from "../services/ollamaService";
import { VllmStatus } from "../types/ollama.types";

/**
 * Custom hook to monitor vLLM model status
 * Single Responsibility: Poll and manage model loading status
 */
export const useModelStatus = () => {
  const [modelStatus, setModelStatus] = useState<VllmStatus | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const status = await OllamaService.getVllmStatus();
        if (status) {
          setModelStatus(status);
        }
      } catch (error) {
        // Silent fail - status polling should not disrupt UI
        console.debug("Failed to fetch model status:", error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds
    interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const isModelLoading = (modelId: string): boolean => {
    return !!(
      modelStatus &&
      modelStatus.modelId === modelId &&
      modelStatus.state !== "ready" &&
      modelStatus.state !== "idle" &&
      modelStatus.state !== "error"
    );
  };

  return {
    modelStatus,
    isModelLoading,
  };
};

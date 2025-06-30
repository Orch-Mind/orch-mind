// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useState } from "react";
import { OllamaService } from "../services/ollamaService";

/**
 * Custom hook to monitor Ollama connection status
 * Single Responsibility: Poll and manage connection status
 */
export const useModelStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        setIsLoading(true);
        // Use fetchInstalledModels to test connectivity
        await OllamaService.fetchInstalledModels();
        setIsConnected(true);
      } catch (error) {
        // Silent fail - status polling should not disrupt UI
        console.debug("Failed to check Ollama connection:", error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkConnection();

    // Poll every 10 seconds (less frequent than before)
    interval = setInterval(checkConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isLoading,
  };
};

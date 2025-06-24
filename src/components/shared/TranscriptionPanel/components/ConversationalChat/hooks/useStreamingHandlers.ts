// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect } from "react";
import { StreamingManager } from "../managers/StreamingManager";

/**
 * Hook que expõe handlers de streaming no window para TranscriptionPromptProcessor
 * Aplica DRY: Evita duplicação da lógica de handlers
 * Aplica KISS: Simples interface entre componentes
 */
export function useStreamingHandlers(
  streamingManager: StreamingManager,
  setIsProcessing: (value: boolean) => void,
  setProcessingStatus: (status: string) => void
) {
  useEffect(() => {
    // Handler para início do streaming
    const handleStreamingStart = () => {
      console.log("[useStreamingHandlers] handleStreamingStart called", {
        hasManager: !!streamingManager,
      });
      if (!streamingManager) {
        console.error("[useStreamingHandlers] StreamingManager is null!");
        return;
      }
      streamingManager.startStreaming();
      setIsProcessing(true);
      setProcessingStatus("");
    };

    // Handler para chunks de streaming
    const handleStreamingChunk = (chunk: string) => {
      console.log("[useStreamingHandlers] handleStreamingChunk called", {
        hasManager: !!streamingManager,
        chunkPreview: chunk.substring(0, 30),
      });
      if (!streamingManager) {
        console.error("[useStreamingHandlers] StreamingManager is null!");
        return;
      }
      streamingManager.processChunk(chunk);
    };

    // Handler para fim do streaming
    const handleStreamingEnd = () => {
      console.log("[useStreamingHandlers] handleStreamingEnd called", {
        hasManager: !!streamingManager,
      });
      if (!streamingManager) {
        console.error("[useStreamingHandlers] StreamingManager is null!");
        return;
      }
      streamingManager.endStreaming();
      setIsProcessing(false);
    };

    // Expõe handlers no window
    if (typeof window !== "undefined") {
      (window as any).__handleStreamingStart = handleStreamingStart;
      (window as any).__handleStreamingChunk = handleStreamingChunk;
      (window as any).__handleStreamingEnd = handleStreamingEnd;
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__handleStreamingStart;
        delete (window as any).__handleStreamingChunk;
        delete (window as any).__handleStreamingEnd;
      }
    };
  }, [streamingManager, setIsProcessing, setProcessingStatus]);
}

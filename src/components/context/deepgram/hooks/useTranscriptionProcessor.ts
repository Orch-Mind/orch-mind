// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useRef } from "react";
import { DeepgramTranscriptionService } from "../services/DeepgramTranscriptionService";

interface TranscriptionActions {
  sendTranscriptionPrompt: (temporaryContext?: string) => Promise<void>;
  sendDirectMessage: (
    message: string,
    temporaryContext?: string
  ) => Promise<void>;
  flushTranscriptionsToUI: () => void;
  setAutoQuestionDetection: (enabled: boolean) => void;
}

/**
 * Hook for managing transcription processing
 * Following Single Responsibility Principle
 */
export function useTranscriptionProcessor(
  transcriptionService: DeepgramTranscriptionService | null,
  isProcessing: boolean,
  dispatch: React.Dispatch<any>,
  globalProcessingRef: React.MutableRefObject<boolean>
): TranscriptionActions {
  const transcriptionRef = useRef(transcriptionService);

  // Update ref when service changes
  transcriptionRef.current = transcriptionService;

  /**
   * Wait for transcription service to be available
   */
  const waitForService = useCallback(
    async (maxWaitTime: number = 5000): Promise<boolean> => {
      const startTime = Date.now();
      const checkInterval = 100; // Check every 100ms

      while (Date.now() - startTime < maxWaitTime) {
        if (transcriptionRef.current) {
          console.log("✅ Transcription service is now available");
          return true;
        }
        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }

      console.error("❌ Timeout waiting for transcription service");
      return false;
    },
    []
  );

  /**
   * Send message directly through IPC when transcription service is not available
   */
  const sendDirectMessageViaIPC = async (
    message: string,
    temporaryContext?: string
  ) => {
    console.log("📨 [IPC] Sending direct message via IPC:", {
      message: message.substring(0, 50),
      hasContext: !!temporaryContext,
      timestamp: new Date().toISOString(),
    });

    // Check if electron API is available
    if (typeof window !== "undefined" && window.electronAPI) {
      try {
        // Use sendNeuralPrompt which is the correct method from IElectronAPI
        // The message is passed as temporaryContext since that's how the API expects it
        const fullContext = temporaryContext
          ? `${message}\n\nContext: ${temporaryContext}`
          : message;

        await window.electronAPI.sendNeuralPrompt(fullContext);
        console.log("✅ [IPC] Direct message sent successfully");
      } catch (error) {
        console.error("❌ [IPC] Error sending direct message:", error);
        throw error;
      }
    } else {
      throw new Error("Electron API not available");
    }
  };

  /**
   * Start transcription processing with concurrency protection
   */
  const sendTranscriptionPrompt = useCallback(
    async (temporaryContext?: string) => {
      console.log("🚀 [TRANSCRIPTION] sendTranscriptionPrompt called:", {
        temporaryContext,
        hasContext: !!temporaryContext,
        isProcessing,
        globalProcessingRef: globalProcessingRef.current,
        timestamp: new Date().toISOString(),
      });

      // Check global ref for immediate synchronous blocking
      if (globalProcessingRef.current) {
        console.warn(
          "⚠️ [GLOBAL_REF] Blocking: processing already in progress"
        );
        return Promise.reject(new Error("PROCESSING_IN_PROGRESS"));
      }

      // Set global ref immediately
      globalProcessingRef.current = true;

      // Check for concurrent processing (state-based)
      if (isProcessing) {
        console.warn(
          "⚠️ Blocking new prompt: processing already in progress (state check)"
        );
        globalProcessingRef.current = false;
        return Promise.reject(new Error("PROCESSING_IN_PROGRESS"));
      }

      try {
        // Wait for service to be available
        if (!transcriptionRef.current) {
          console.log("⏳ Waiting for transcription service...");
          const serviceAvailable = await waitForService();
          if (!serviceAvailable) {
            throw new Error("Transcription service not available");
          }
        }

        // Start processing
        dispatch({ type: "SET_PROCESSING", payload: true });
        console.log("🔄 Processing state set to true");

        await transcriptionRef.current!.sendTranscriptionPrompt(
          temporaryContext
        );
        console.log("✅ Transcription prompt completed successfully");

        dispatch({ type: "SET_PROCESSING", payload: false });
      } catch (error) {
        console.error("❌ Error processing prompt:", error);
        dispatch({ type: "SET_PROCESSING", payload: false });
        throw error;
      } finally {
        // Always clear the global ref
        globalProcessingRef.current = false;
        console.log("🔓 [GLOBAL_REF] Processing lock released");
      }
    },
    [isProcessing, dispatch, globalProcessingRef, waitForService]
  );

  /**
   * Send direct message from chat
   */
  const sendDirectMessage = useCallback(
    async (message: string, temporaryContext?: string) => {
      console.log("💬 [TRANSCRIPTION] sendDirectMessage called:", {
        message: message.substring(0, 50),
        hasContext: !!temporaryContext,
        isProcessing,
        globalProcessingRef: globalProcessingRef.current,
        hasTranscriptionService: !!transcriptionRef.current,
        timestamp: new Date().toISOString(),
      });

      // Check global ref for immediate synchronous blocking
      if (globalProcessingRef.current) {
        console.warn(
          "⚠️ [GLOBAL_REF] Blocking: processing already in progress"
        );
        return Promise.reject(new Error("PROCESSING_IN_PROGRESS"));
      }

      // Set global ref immediately
      globalProcessingRef.current = true;

      if (isProcessing) {
        console.warn(
          "⚠️ Blocking new message: processing already in progress (state check)"
        );
        globalProcessingRef.current = false;
        return Promise.reject(new Error("PROCESSING_IN_PROGRESS"));
      }

      try {
        dispatch({ type: "SET_PROCESSING", payload: true });

        // Wait for service to be available if needed
        if (!transcriptionRef.current) {
          console.log("⏳ Waiting for transcription service...");
          const serviceAvailable = await waitForService();
          if (!serviceAvailable) {
            throw new Error(
              "Transcription service not available after timeout"
            );
          }
        }

        // Use the transcription service
        await transcriptionRef.current!.sendDirectMessage(
          message,
          temporaryContext
        );

        console.log("✅ Direct message completed successfully");
        dispatch({ type: "SET_PROCESSING", payload: false });
      } catch (error) {
        console.error("❌ Error sending direct message:", error);
        dispatch({ type: "SET_PROCESSING", payload: false });
        throw error;
      } finally {
        // Always clear the global ref
        globalProcessingRef.current = false;
        console.log("🔓 [GLOBAL_REF] Processing lock released");
      }
    },
    [isProcessing, dispatch, globalProcessingRef, waitForService]
  );

  /**
   * Flush accumulated transcriptions to UI
   */
  const flushTranscriptionsToUI = useCallback(() => {
    if (!transcriptionRef.current) {
      // Silently return if service is not available
      // This can happen when sending direct messages before service initialization
      console.log(
        "⚠️ Transcription service not available for flush - skipping"
      );
      return;
    }

    console.log("📤 Flushing transcriptions to UI");
    transcriptionRef.current.flushTranscriptionsToUI();
  }, []);

  /**
   * Set auto question detection
   */
  const setAutoQuestionDetection = useCallback((enabled: boolean) => {
    if (transcriptionRef.current) {
      transcriptionRef.current.setAutoQuestionDetection(enabled);
    }
  }, []);

  return {
    sendTranscriptionPrompt,
    sendDirectMessage,
    flushTranscriptionsToUI,
    setAutoQuestionDetection,
  };
}

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
        if (!transcriptionRef.current) {
          console.error("❌ Transcription service not available");
          globalProcessingRef.current = false;
          return;
        }

        // Start processing
        dispatch({ type: "SET_PROCESSING", payload: true });
        console.log("🔄 Processing state set to true");

        await transcriptionRef.current.sendTranscriptionPrompt(
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
    [isProcessing, dispatch, globalProcessingRef]
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
        if (!transcriptionRef.current) {
          console.error("❌ Transcription service not available");
          globalProcessingRef.current = false;
          return;
        }

        dispatch({ type: "SET_PROCESSING", payload: true });

        await transcriptionRef.current.sendDirectMessage(
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
    [isProcessing, dispatch, globalProcessingRef]
  );

  /**
   * Flush accumulated transcriptions to UI
   */
  const flushTranscriptionsToUI = useCallback(() => {
    if (!transcriptionRef.current) {
      console.error("❌ Transcription service not available");
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

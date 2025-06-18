// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useToast } from "../../../../App";
import {
  ConnectionState,
  MicrophoneState,
  useDeepgram,
  useMicrophone,
  useTranscription,
} from "../../../context";
import { LanguageContext } from "../../../context/LanguageContext";
// We're directly using the transcription context's texts object
// so no need to import the TranscriptionTextsState interface

export const useTranscriptionManager = () => {
  const transcriptionContext = useTranscription();
  if (!transcriptionContext) return null;

  const { texts, setTexts } = transcriptionContext;

  // Always use LanguageContext, which now syncs with storage
  const { language, setLanguage } = useContext(LanguageContext);
  const { showToast } = useToast();

  const {
    microphoneState,
    getCurrentMicrophoneState,
    startMicrophone,
    stopMicrophone,
    audioDevices,
    selectedDevices,
    handleDeviceChange,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsMicrophoneOn,
    setIsSystemAudioOn,
  } = useMicrophone();

  const {
    connectionState,
    sendTranscriptionPrompt,
    sendDirectMessage,
    connectToDeepgram,
    disconnectFromDeepgram,
    waitForConnectionState,
    getConnectionStatus,
    hasActiveConnection,
    flushTranscriptionsToUI,
    clearTranscriptionData,
    transcriptionService,
  } = useDeepgram();

  // Memoized utility functions to prevent recreating on every render
  const clearTranscription = useCallback(() => {
    console.log("🧹 [CLEAR_TRANSCRIPTION] Clearing all transcription data");

    // Clear UI state
    setTexts((prev) => ({ ...prev, transcription: "" }));

    // Clear service-level data if available
    if (clearTranscriptionData) {
      clearTranscriptionData();
    }

    // Also clear the TranscriptionStorageService data
    if (transcriptionService?.clearTranscriptionData) {
      console.log("🧹 Clearing TranscriptionStorageService data");
      transcriptionService.clearTranscriptionData();
    }
  }, [setTexts, clearTranscriptionData, transcriptionService]);

  const clearAiResponse = useCallback(
    () => setTexts((prev) => ({ ...prev, aiResponse: "" })),
    [setTexts]
  );

  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [temporaryContext, setTemporaryContext] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLocalProcessing, setIsLocalProcessing] = useState<boolean>(false);
  const temporaryContextRef = useRef<string>("");
  const transcriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    temporaryContextRef.current = temporaryContext;
  }, [temporaryContext]);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop =
        transcriptionRef.current.scrollHeight;
    }
  }, [texts.transcription]);

  useEffect(() => {
    if (!showDetailedDiagnostics) return;

    const intervalId = setInterval(() => {
      if (getConnectionStatus) {
        setConnectionDetails(getConnectionStatus());
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showDetailedDiagnostics, getConnectionStatus]);

  // Setup electron listeners for transcription events
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      const removeListener = window.electronAPI.onRealtimeTranscription(
        (text) => {
          setTexts((prev) => {
            const newTranscription = prev.transcription
              ? `${prev.transcription}\n${text}`
              : text;

            return {
              ...prev,
              transcription: newTranscription,
            };
          });
        }
      );

      return () => {
        removeListener();
      };
    }
  }, []);

  // Memoized toggleRecording to prevent recreating on every render
  const toggleRecording = useCallback(async () => {
    const currentState = getCurrentMicrophoneState();
    console.log("🔊 Button clicked! Microphone state:", currentState);

    if (currentState === MicrophoneState.Open) {
      console.log("🚫 Stopping recording via button...");
      stopMicrophone();

      // Clear transcriptions when stopping recording
      console.log("🧹 Clearing transcriptions after stopping recording");
      clearTranscription();

      // Also clear the TranscriptionStorageService data
      if (transcriptionService?.clearTranscriptionData) {
        console.log("🧹 Clearing TranscriptionStorageService data");
        transcriptionService.clearTranscriptionData();
      }
    } else {
      console.log("🎤 Starting recording via button...");

      // Clear both UI and service data before starting a new recording
      console.log(
        "🧹 Clearing all previous transcription data for a fresh start."
      );
      clearTranscription(); // Clears UI state from TranscriptionContext
      if (clearTranscriptionData) {
        clearTranscriptionData(); // Clears service-level data from DeepgramContext
      }

      // Also clear the TranscriptionStorageService data
      if (transcriptionService?.clearTranscriptionData) {
        console.log(
          "🧹 Clearing TranscriptionStorageService data before starting"
        );
        transcriptionService.clearTranscriptionData();
      }

      // If no audio source is active, enable system audio by default before recording
      if (!isMicrophoneOn && !isSystemAudioOn) {
        setIsSystemAudioOn(true);
        setTimeout(() => startMicrophone(), 100);
      } else {
        startMicrophone();
      }
    }
  }, [
    getCurrentMicrophoneState,
    stopMicrophone,
    startMicrophone,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsSystemAudioOn,
    clearTranscriptionData,
    clearTranscription,
    transcriptionService,
  ]);

  // Memoize handleSendPrompt to prevent recreating on every render
  const handleSendPrompt = useCallback(
    async (messageContent?: string, contextContent?: string) => {
      // Proteção de duplicação agora é feita no DeepgramContext (global)

      try {
        // Set state for UI updates (e.g., disabling button visually)
        setIsLocalProcessing(true);

        // Check if there's any content to send
        const currentTranscription = texts.transcription?.trim();
        if (!messageContent && !currentTranscription) {
          console.warn("⚠️ [SEND_PROMPT] No content to send");
          showToast("Aviso", "Nenhuma mensagem para enviar", "neutral");
          setIsLocalProcessing(false);
          return;
        }

        console.log("🚀 [SEND_PROMPT] Starting prompt send:", {
          messageContent,
          contextContent,
          temporaryContext: temporaryContextRef.current,
          hasDirectMessage: !!messageContent,
          hasTranscription: !!currentTranscription,
          timestamp: new Date().toISOString(),
        });

        // If it's a direct message (from chat input), use sendDirectMessage
        if (messageContent) {
          console.log("💬 [SEND_PROMPT] Sending as direct message");
          await sendDirectMessage(
            messageContent,
            contextContent || temporaryContextRef.current
          );
        } else {
          // Otherwise, use the transcription-based prompt
          // Only flush transcriptions when we have actual transcriptions
          if (flushTranscriptionsToUI && currentTranscription) {
            console.log("📤 [SEND_PROMPT] Flushing transcriptions before send");
            flushTranscriptionsToUI();
          }

          console.log("🎯 [SEND_PROMPT] Sending as transcription prompt");
          await sendTranscriptionPrompt(temporaryContextRef.current);
        }

        console.log("✅ [SEND_PROMPT] Prompt send completed successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message === "PROCESSING_IN_PROGRESS"
              ? "Um processamento já está em andamento. Aguarde a conclusão."
              : error.message
            : "Erro desconhecido ao processar o prompt";

        console.error("❌ [SEND_PROMPT] Error sending prompt:", error);
        showToast("Erro", errorMessage, "error");
      } finally {
        // Always clear state
        setIsLocalProcessing(false);
      }
    },
    [
      sendTranscriptionPrompt,
      sendDirectMessage,
      showToast,
      flushTranscriptionsToUI,
      texts.transcription,
      clearTranscriptionData,
      clearTranscription,
    ]
  );

  // Setup electron listeners for AI prompt responses (FIXED: No dependencies)
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      // Track response accumulation
      let responseBuffer = "";
      let isAccumulatingResponse = false;

      // Create stable callbacks that don't depend on changing state
      const handlePartialResponse = (partialResponse: string) => {
        console.log("🔄 [IPC] Partial response received:", {
          response: partialResponse.substring(0, 50),
          length: partialResponse.length,
          timestamp: new Date().toISOString(),
        });

        // Mark that we're accumulating a response
        isAccumulatingResponse = true;
        responseBuffer = partialResponse;

        // Update with the partial response
        // Don't clear it - let the component decide when to clear
        setTexts((prev) => ({
          ...prev,
          aiResponse: partialResponse,
        }));
      };

      const handleSuccessResponse = (finalResponse: string) => {
        console.log("✅ [IPC] Final response received:", {
          response: finalResponse.substring(0, 50),
          length: finalResponse.length,
          timestamp: new Date().toISOString(),
        });

        // Clear accumulation state
        isAccumulatingResponse = false;
        responseBuffer = "";

        // Set the final response WITHOUT clearing transcription
        // This allows new transcriptions to continue appearing
        setTexts((prev) => ({
          ...prev,
          aiResponse: finalResponse,
        }));
      };

      const handleErrorResponse = (error: string) => {
        console.log("❌ [IPC] Error response received:", {
          error,
          timestamp: new Date().toISOString(),
        });

        // Clear accumulation state
        isAccumulatingResponse = false;
        responseBuffer = "";

        setTexts((prev) => ({
          ...prev,
          aiResponse: `Erro: ${error}`,
        }));
        showToast("Erro", error, "error");
      };

      const handleSendingState = () => {
        console.log("🔄 [IPC] Sending state received:", {
          timestamp: new Date().toISOString(),
        });

        // Reset accumulation state when starting a new request
        isAccumulatingResponse = false;
        responseBuffer = "";

        setTexts((prev) => ({
          ...prev,
          aiResponse: "Processando...",
        }));
      };

      const removePartialListener = window.electronAPI.onPromptPartialResponse(
        handlePartialResponse
      );
      const removeSuccessListener = window.electronAPI.onPromptSuccess(
        handleSuccessResponse
      );
      const removeErrorListener =
        window.electronAPI.onPromptError(handleErrorResponse);
      const removeSendingListener =
        window.electronAPI.onPromptSending(handleSendingState);

      return () => {
        removePartialListener();
        removeSuccessListener();
        removeErrorListener();
        removeSendingListener();
      };
    }
  }, [setTexts, showToast]);

  // Update Deepgram language when UI language changes
  useEffect(() => {
    if (language) {
      console.log(
        `🌐 Language changed to ${language}, will use on next connection`
      );
    }
  }, [language]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Error) {
      showToast(
        "Error",
        "Failed to access audio. Check your microphone and permissions.",
        "error"
      );
    }
  }, [microphoneState]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded, setIsExpanded]);

  return {
    language,
    setLanguage,
    microphoneState,
    connectionState,
    toggleRecording,
    handleSendPrompt,
    clearTranscription,
    clearAiResponse,
    toggleExpand,
    isExpanded,
    temporaryContext,
    setTemporaryContext,
    texts,
    setTexts,
    audioDevices,
    selectedDevices,
    handleDeviceChange,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsMicrophoneOn,
    setIsSystemAudioOn,
    showDetailedDiagnostics,
    setShowDetailedDiagnostics,
    connectionDetails,
    setConnectionDetails,
    transcriptionRef,
    getConnectionStatus,
    disconnectFromDeepgram,
    connectToDeepgram,
    waitForConnectionState,
    hasActiveConnection,
    ConnectionState,
    clearTranscriptionData,
    isLocalProcessing,
  };
};

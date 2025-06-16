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
    connectToDeepgram,
    disconnectFromDeepgram,
    waitForConnectionState,
    getConnectionStatus,
    hasActiveConnection,
  } = useDeepgram();

  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [temporaryContext, setTemporaryContext] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
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
    } else {
      console.log("🎤 Starting recording via button...");
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
  ]);

  // Memoize handleSendPrompt to prevent recreating on every render
  const handleSendPrompt = useCallback(
    async (messageContent?: string) => {
      try {
        // Use messageContent if provided (from chat), otherwise use temporaryContextRef.current (from traditional flow)
        const contextToUse = messageContent || temporaryContextRef.current;
        console.log("🚀 [SEND_PROMPT] Starting prompt send:", {
          messageContent,
          temporaryContext: temporaryContextRef.current,
          contextToUse,
          hasContext: !!contextToUse,
        });

        await sendTranscriptionPrompt(contextToUse);
        console.log("✅ [SEND_PROMPT] Prompt sent successfully");

        // Only clear temporaryContext if we used the traditional flow
        if (!messageContent) {
          setTemporaryContext("");
        }
      } catch (error) {
        console.error("❌ [SEND_PROMPT] Error sending prompt:", error);
        setTexts((prev) => ({
          ...prev,
          aiResponse: `Error: ${
            error instanceof Error ? error.message : "Failed to send prompt"
          }`,
        }));

        showToast("Error", "Failed to send prompt", "error");
      }
    },
    [sendTranscriptionPrompt, setTemporaryContext, setTexts, showToast]
  ); // Memoized with proper dependencies

  // Setup electron listeners for AI prompt responses (FIXED: No dependencies)
  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      // Create stable callbacks that don't depend on changing state
      const handlePartialResponse = (partialResponse: string) => {
        console.log("🔄 [IPC] Partial response received:", {
          response: partialResponse,
          length: partialResponse.length,
          timestamp: new Date().toISOString(),
        });
        setTexts((prev) => ({
          ...prev,
          aiResponse: partialResponse,
        }));
      };

      const handleSuccessResponse = (finalResponse: string) => {
        console.log("✅ [IPC] Final response received:", {
          response: finalResponse,
          length: finalResponse.length,
          timestamp: new Date().toISOString(),
        });
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
        setTexts((prev) => ({
          ...prev,
          aiResponse: "Processando...",
        }));
      };

      const handlePromptSend = () => {
        console.log("📤 [IPC] Send prompt event received");
        handleSendPrompt();
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
      const removeSendListener =
        window.electronAPI.onPromptSend(handlePromptSend);

      return () => {
        removePartialListener();
        removeSuccessListener();
        removeErrorListener();
        removeSendingListener();
        removeSendListener();
      };
    }
  }, [setTexts, showToast, handleSendPrompt]); // Stable dependencies only

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

  // Memoized utility functions to prevent recreating on every render
  const clearTranscription = useCallback(
    () => setTexts((prev) => ({ ...prev, transcription: "" })),
    [setTexts]
  );

  const clearAiResponse = useCallback(
    () => setTexts((prev) => ({ ...prev, aiResponse: "" })),
    [setTexts]
  );

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
  };
};

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import { useEffect, useRef, useState } from "react";
import { ConnectionState, MicrophoneState, useDeepgram, useMicrophone, useTranscription } from "../../../context";
import { useToast } from "../../../../App";
import { LanguageContext } from "../../../context/LanguageContext";
import { useContext } from "react";
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
    setIsSystemAudioOn
  } = useMicrophone();

  const {
    connectionState,
    sendTranscriptionPrompt,
    connectToDeepgram,
    disconnectFromDeepgram,
    waitForConnectionState,
    getConnectionStatus,
    hasActiveConnection
  } = useDeepgram();

  const [showDetailedDiagnostics, setShowDetailedDiagnostics] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<Record<string, unknown> | null>(null);
  const [temporaryContext, setTemporaryContext] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const temporaryContextRef = useRef<string>("");
  const transcriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    temporaryContextRef.current = temporaryContext;
  }, [temporaryContext]);

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
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
    if (typeof window !== 'undefined' && window.electronAPI) {
      const removeListener = window.electronAPI.onRealtimeTranscription((text) => {
        setTexts(prev => {
          const newTranscription = prev.transcription
            ? `${prev.transcription}\n${text}`
            : text;

          return {
            ...prev,
            transcription: newTranscription
          };
        });
      });

      return () => {
        removeListener();
      };
    }
  }, []);

  // Setup electron listeners for AI prompt responses
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const removePartialListener = window.electronAPI.onPromptPartialResponse((partialResponse) => {
        setTexts(prev => ({
          ...prev,
          aiResponse: partialResponse
        }));
      });

      const removeSuccessListener = window.electronAPI.onPromptSuccess((finalResponse) => {
        setTexts(prev => ({
          ...prev,
          aiResponse: finalResponse
        }));
      });

      const removeErrorListener = window.electronAPI.onPromptError((error) => {
        setTexts(prev => ({
          ...prev,
          aiResponse: `Erro: ${error}`
        }));

        showToast("Erro", error, "error");
      });

      const removeSendingListener = window.electronAPI.onPromptSending(() => {
        setTexts(prev => ({
          ...prev,
          aiResponse: "Processando..."
        }));
      });

      const removeSendListener = window.electronAPI.onPromptSend(() => {
        handleSendPrompt();
      });

      return () => {
        removePartialListener();
        removeSuccessListener();
        removeErrorListener();
        removeSendingListener();
        removeSendListener();
      };
    }
  }, []);

  // Update Deepgram language when UI language changes
  useEffect(() => {
    if (language) {
      console.log(`🌐 Language changed to ${language}, will use on next connection`);
    }
  }, [language]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Error) {
      showToast("Error", "Failed to access audio. Check your microphone and permissions.", "error");
    }
  }, [microphoneState]);

  // Simplified function for the recording button that imitates the behavior of the Option+Enter shortcut
  const toggleRecording = async () => {
    const currentState = getCurrentMicrophoneState();
    console.log('🔊 Button clicked! Microphone state:', currentState);
    
    if (currentState === MicrophoneState.Open) {
      console.log('🚫 Stopping recording via button...');
      stopMicrophone();
    } else {
      console.log('🎤 Starting recording via button...');
      // If no audio source is active, enable system audio by default before recording
      if (!isMicrophoneOn && !isSystemAudioOn) {
        setIsSystemAudioOn(true);
        setTimeout(() => startMicrophone(), 100);
      } else {
        startMicrophone();
      }
    }
  };

  const handleSendPrompt = async () => {
    try {
      await sendTranscriptionPrompt(temporaryContextRef.current);
      setTemporaryContext("");
    } catch (error) {
      setTexts((prev) => ({
        ...prev,
        aiResponse: `Error: ${error instanceof Error ? error.message : "Failed to send prompt"}`
      }));

      showToast("Error", "Failed to send prompt", "error");
    }
  };

  const clearTranscription = () => setTexts((prev) => ({ ...prev, transcription: "" }));
  const clearAiResponse = () => setTexts((prev) => ({ ...prev, aiResponse: "" }));

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

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
    ConnectionState
  };
};

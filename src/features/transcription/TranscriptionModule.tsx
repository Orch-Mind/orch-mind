// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef } from "react";
import {
  MicrophoneState,
  useDeepgram,
  useMicrophone,
} from "../../components/context";
import { ConnectionState } from "../../components/context/deepgram/interfaces/deepgram/IDeepgramService";
import TranscriptionPanel from "../../components/shared/TranscriptionPanel/TranscriptionPanel";

/**
 * Main transcription module that encapsulates all transcription-related functionality
 * Following Single Responsibility Principle by handling only transcription logic
 */
export const TranscriptionModule: React.FC = () => {
  // Get microphone hooks and state
  const {
    microphoneState,
    startMicrophone,
    stopMicrophone,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsSystemAudioOn,
  } = useMicrophone();

  // Get deepgram services
  const {
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
    flushTranscriptionsToUI,
  } = useDeepgram();

  // Refs to maintain latest values in event handlers
  const microphoneStateRef = useRef(microphoneState);
  const isMicrophoneOnRef = useRef(isMicrophoneOn);
  const isSystemAudioOnRef = useRef(isSystemAudioOn);

  // Keep refs up to date
  useEffect(() => {
    microphoneStateRef.current = microphoneState;
  }, [microphoneState]);

  useEffect(() => {
    isMicrophoneOnRef.current = isMicrophoneOn;
  }, [isMicrophoneOn]);

  useEffect(() => {
    isSystemAudioOnRef.current = isSystemAudioOn;
  }, [isSystemAudioOn]);

  // Connect/disconnect Deepgram based on microphone state
  useEffect(() => {
    if (microphoneState === MicrophoneState.Open) {
      // Start transcription if microphone is open and not already connected
      if (
        connectionState !== ConnectionState.OPEN &&
        connectionState !== ConnectionState.CONNECTING
      ) {
        console.log(
          "🎤 Starting Deepgram connection due to microphone state change"
        );
        connectToDeepgram();
      }
    } else if (microphoneState === MicrophoneState.Stopped) {
      // Stop transcription when recording stops
      if (connectionState === ConnectionState.OPEN) {
        console.log(
          "🛑 Stopping Deepgram connection due to microphone state change"
        );

        // Note: Transcriptions are already displayed in real-time
        // No need to flush on stop as they're already visible
        console.log("🛑 Recording stopped, transcriptions already visible");

        disconnectFromDeepgram();
      }
    }
  }, [
    microphoneState,
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
    flushTranscriptionsToUI,
  ]);

  // Setup keyboard shortcut for recording toggle
  useEffect(() => {
    const unsubscribeToggleRecording = window.electronAPI.toogleNeuralRecording(
      () => {
        console.log("🔊 Shortcut pressed! Toggling recording...");
        if (microphoneStateRef.current === MicrophoneState.Open) {
          console.log("🛑 Stopping recording via shortcut...");
          stopMicrophone();
        } else {
          console.log("🎤 Starting recording via shortcut...");
          // If no audio source is active, activate system audio by default before recording
          if (!isMicrophoneOnRef.current && !isSystemAudioOnRef.current) {
            setIsSystemAudioOn(true);
            setTimeout(() => startMicrophone(), 100);
          } else {
            startMicrophone();
          }
        }
      }
    );

    return () => {
      unsubscribeToggleRecording();
    };
  }, []);

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      <TranscriptionPanel
        onClose={() => {}} // No close functionality needed
        width="100%"
      />
    </div>
  );
};

export default TranscriptionModule;

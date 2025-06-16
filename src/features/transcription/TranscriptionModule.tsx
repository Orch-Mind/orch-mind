// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useRef, useState } from "react";
import {
  MicrophoneState,
  useDeepgram,
  useMicrophone,
} from "../../components/context";
import { ConnectionState } from "../../components/context/deepgram/interfaces/deepgram/IDeepgramService";
import ModelLoadingTest from "../../components/debug/ModelLoadingTest";
import LocalModelManager from "../../components/debug/LocalModelManager";
import { TransformersTest } from "../../components/debug/TransformersTest";
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
  const { connectToDeepgram, disconnectFromDeepgram, connectionState } =
    useDeepgram();

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
        disconnectFromDeepgram();
      }
    }
  }, [
    microphoneState,
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
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

  // Add tab state for switching between transcription and test modes
  const [activeTab, setActiveTab] = useState<
    "transcription" | "test" | "models"
  >("transcription");

  return (
    <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Tab navigation */}
      <div className="flex bg-gray-800 border-b border-gray-600">
        <button
          onClick={() => setActiveTab("transcription")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "transcription"
              ? "bg-blue-600 text-white border-b-2 border-blue-400"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
        >
          🎤 Transcription
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "test"
              ? "bg-green-600 text-white border-b-2 border-green-400"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
        >
          🧪 Transformers Test
        </button>
        <button
          onClick={() => setActiveTab("models")}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === "models"
              ? "bg-purple-600 text-white border-b-2 border-purple-400"
              : "text-gray-300 hover:text-white hover:bg-gray-700"
          }`}
        >
          🤖 Model Loading Test
        </button>
      </div>

      {/* Tab content */}
      <div
        style={{
          height: "calc(100% - 48px)",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {activeTab === "transcription" ? (
          <TranscriptionPanel
            onClose={() => {}} // No close functionality needed
            width="100%"
          />
        ) : activeTab === "test" ? (
          <div className="p-4 h-full overflow-auto bg-gray-900">
            <TransformersTest />
          </div>
        ) : (
          <div className="h-full overflow-auto bg-gray-900">
            <LocalModelManager />
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionModule;

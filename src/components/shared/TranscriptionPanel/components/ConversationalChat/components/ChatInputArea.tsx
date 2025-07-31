// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState, useEffect } from "react";
import {
  getOption,
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { useDeepgram } from "../../../../../context";
import { ChatState, ConversationalChatProps } from "../types/ChatTypes";
import { ChatControls } from "./ChatControls";
import { ContextInput } from "./ContextInput";
// import { DebugControls } from "./DebugControls"; // Removed - debug controls disabled
import { MessageInput } from "./MessageInput";
import { TranscriptionDisplay } from "./TranscriptionDisplay";

interface ChatInputAreaProps extends ConversationalChatProps {
  chatState: ChatState;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggleContext: () => void;
  onAddTestMessage: () => void;
  onAddTestAI: () => void;
  onRestore: () => void;
  onClearAll: () => void;
  hasBackup: boolean;
  // TODO: Re-enable for future versions - Audio Settings in chat input
  // onToggleAudioSettings?: () => void;
  // showAudioSettings?: boolean;
  // audioSettingsButtonRef?: React.RefObject<HTMLElement>;
}

/**
 * Chat input area component
 * Follows composition pattern - combines input-related components
 * Debug controls removed for cleaner UI
 */
export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  transcriptionText,
  onClearTranscription,
  microphoneState,
  onToggleRecording,
  chatState,
  onSendMessage,
  onKeyPress,
  onToggleContext,
  onAddTestMessage,
  onAddTestAI,
  onRestore,
  onClearAll,
  hasBackup,
  // TODO: Re-enable for future versions - Audio Settings in chat input
  // onToggleAudioSettings,
  // showAudioSettings,
  // audioSettingsButtonRef,
}) => {
  // Web Search state management
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(
    () => getOption<boolean>(STORAGE_KEYS.WEB_SEARCH_ENABLED) || false
  );

  // AI Mode state management
  const [aiMode, setAiMode] = useState<"chat" | "agent">(
    () => getOption<string>(STORAGE_KEYS.AI_MODE) as "chat" | "agent" || "chat"
  );

  // Handler for toggling web search
  const handleToggleWebSearch = () => {
    const newState = !webSearchEnabled;
    setWebSearchEnabled(newState);
    setOption(STORAGE_KEYS.WEB_SEARCH_ENABLED, newState);
    
    console.log(`🌐 [Web Search] ${newState ? "Enabled" : "Disabled"}`);
  };

  // Handler for toggling AI mode
  const handleToggleAiMode = () => {
    const newMode = aiMode === "chat" ? "agent" : "chat";
    setAiMode(newMode);
    setOption(STORAGE_KEYS.AI_MODE, newMode);
    
    console.log(`🤖 [AI Mode] Switched to ${newMode.toUpperCase()} mode`);
  };

  // 🔧 SOLUÇÃO: Listener reativo para sincronizar AI_MODE com storage
  useEffect(() => {
    const checkStorageSync = () => {
      const storageMode = getOption<string>(STORAGE_KEYS.AI_MODE) as "chat" | "agent" || "chat";
      if (storageMode !== aiMode) {
        console.log(`🔄 [AI Mode Sync] Storage changed to ${storageMode.toUpperCase()}, updating UI`);
        setAiMode(storageMode);
      }
    };

    // Check immediately
    checkStorageSync();

    // Set up periodic check (fallback for edge cases)
    const interval = setInterval(checkStorageSync, 1000);

    return () => clearInterval(interval);
  }, [aiMode]); // Depend on aiMode to avoid infinite loops

  const canSend =
    !!(chatState.inputMessage.trim() || transcriptionText.trim()) &&
    !chatState.isProcessing;

  // Get transcriptions with status from Deepgram context
  const { getAllTranscriptionsWithStatus } = useDeepgram();
  const transcriptionsWithStatus = getAllTranscriptionsWithStatus
    ? getAllTranscriptionsWithStatus()
    : [];

  return (
    <div className="chat-input-area">
      {/* Context Input */}
      <ContextInput
        value={chatState.currentContext}
        onChange={chatState.setCurrentContext}
        onClose={() => {
          chatState.setCurrentContext("");
          chatState.setShowContextField(false);
        }}
        show={chatState.showContextField}
      />

      {/* Main Input Area */}
      <div className="main-input-wrapper">
        <div className="input-row">
          {/* Transcription Display */}
          <TranscriptionDisplay
            text={transcriptionText}
            onClear={onClearTranscription}
            transcriptions={transcriptionsWithStatus}
          />

          {/* Input Bottom Row - Input + Controls */}
          <div className="input-bottom-row">
            {/* Message Input */}
            <MessageInput
              value={chatState.inputMessage}
              onChange={chatState.setInputMessage}
              onSend={onSendMessage}
              onKeyPress={onKeyPress}
              placeholder="Type your message or use voice transcription..."
              disabled={chatState.isProcessing}
            />

            {/* Main Chat Controls - Debug controls removed */}
            <ChatControls
              // TODO: Funcionalidade futura - Microphone props (voice input in chat)
              // microphoneState={microphoneState}
              // onToggleRecording={onToggleRecording}
              onSend={onSendMessage}
              onToggleContext={onToggleContext}
              canSend={canSend}
              showContext={
                chatState.showContextField || !!chatState.currentContext
              }
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={handleToggleWebSearch}
              aiMode={aiMode}
              onToggleAiMode={handleToggleAiMode}
              // TODO: Re-enable for future versions - Audio Settings in chat input
              // onToggleAudioSettings={onToggleAudioSettings}
              // showAudioSettings={showAudioSettings}
              // audioSettingsButtonRef={audioSettingsButtonRef}
            />
          </div>
        </div>
      </div>

      {/* TODO: Add AudioSettingsPopover component here
      <AudioSettingsPopover
        show={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
        anchorRef={audioSettingsButtonRef}
        settings={audioSettings}
      />
      */}
    </div>
  );
};

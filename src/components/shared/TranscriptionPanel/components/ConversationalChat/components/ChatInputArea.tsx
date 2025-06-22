// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
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
  onToggleAudioSettings?: () => void;
  showAudioSettings?: boolean;
  audioSettingsButtonRef?: React.RefObject<HTMLElement>;
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
  onToggleAudioSettings,
  showAudioSettings,
  audioSettingsButtonRef,
}) => {
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
              microphoneState={microphoneState}
              onToggleRecording={onToggleRecording}
              onSend={onSendMessage}
              onToggleContext={onToggleContext}
              canSend={canSend}
              showContext={
                chatState.showContextField || !!chatState.currentContext
              }
              onToggleAudioSettings={onToggleAudioSettings}
              showAudioSettings={showAudioSettings}
              audioSettingsButtonRef={audioSettingsButtonRef}
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

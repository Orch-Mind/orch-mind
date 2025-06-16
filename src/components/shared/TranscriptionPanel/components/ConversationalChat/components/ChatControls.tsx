import React from "react";
import { MicrophoneState } from "../../../../../context";
import { ChatControlsProps } from "../types/ChatTypes";

/**
 * Chat controls component
 * Follows Single Responsibility Principle - only handles chat controls
 */
export const ChatControls: React.FC<ChatControlsProps> = ({
  microphoneState,
  onToggleRecording,
  onSend,
  onToggleContext,
  canSend,
  showContext,
}) => {
  return (
    <div className="input-controls">
      {/* Context Toggle Button */}
      <button
        className={`control-btn context-btn ${showContext ? "active" : ""}`}
        onClick={onToggleContext}
        title={showContext ? "Hide context field" : "Add context"}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 5v5l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Microphone Button */}
      <button
        className={`control-btn mic-btn ${
          microphoneState === MicrophoneState.Open ? "recording" : ""
        }`}
        onClick={onToggleRecording}
        title={
          microphoneState === MicrophoneState.Open
            ? "Stop recording"
            : "Start recording"
        }
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {microphoneState === MicrophoneState.Open ? (
            <rect x="9" y="9" width="6" height="6" fill="currentColor" rx="1" />
          ) : (
            <>
              <path
                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                fill="currentColor"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="19"
                x2="12"
                y2="23"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="8"
                y1="23"
                x2="16"
                y2="23"
                stroke="currentColor"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      </button>

      {/* Send Button */}
      <button
        className={`control-btn send-btn ${canSend ? "ready" : "disabled"}`}
        onClick={onSend}
        disabled={!canSend}
        title="Send message (Enter)"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2 12l18-8-8 18-3-7-7-3z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
};

import React from "react";
import { MicrophoneState } from "../../../../../context";
import { ChatControlsProps } from "../types/ChatTypes";

/**
 * Chat controls component with modern futuristic icons
 * Enhanced with better visual feedback and animations
 */
export const ChatControls: React.FC<ChatControlsProps> = ({
  microphoneState,
  onToggleRecording,
  onSend,
  onToggleContext,
  canSend,
  showContext,
  onToggleAudioSettings,
  showAudioSettings,
  audioSettingsButtonRef,
}) => {
  return (
    <div className="input-controls">
      {/* Context Toggle Button - Modern design */}
      <button
        className={`control-btn context-btn ${showContext ? "active" : ""}`}
        onClick={onToggleContext}
        title={showContext ? "Hide context field" : "Add context"}
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 12h8M12 8v8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
        </svg>
      </button>

      {/* Audio Settings Button - Futuristic wave design */}
      <button
        ref={audioSettingsButtonRef as React.RefObject<HTMLButtonElement>}
        className={`control-btn audio-settings-btn ${
          showAudioSettings ? "active" : ""
        }`}
        onClick={onToggleAudioSettings}
        title="Audio settings"
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 12h4l4-4v12l-4-4H3z" fill="currentColor" opacity="0.8" />
          <path
            d="M14 8c1.5 1 2.5 2.5 2.5 4s-1 3-2.5 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M17 5c2.5 1.5 4 4 4 7s-1.5 5.5-4 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </button>

      {/* Microphone Button - Modern minimal design */}
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {microphoneState === MicrophoneState.Open ? (
            // Recording state - animated square
            <g>
              <rect x="8" y="8" width="8" height="8" fill="currentColor" rx="2">
                <animate
                  attributeName="rx"
                  values="2;4;2"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </rect>
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.3"
              />
            </g>
          ) : (
            // Microphone icon - sleek design
            <>
              <rect
                x="9"
                y="3"
                width="6"
                height="11"
                rx="3"
                fill="currentColor"
              />
              <path
                d="M5 10v2a7 7 0 0014 0v-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="19"
                x2="12"
                y2="22"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="8"
                y1="22"
                x2="16"
                y2="22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </button>

      {/* Send Button - Modern arrow design */}
      <button
        className={`control-btn send-btn ${canSend ? "ready" : "disabled"}`}
        onClick={onSend}
        disabled={!canSend}
        title="Send message (Enter)"
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12L5 4l16 8-16 8 2-8zm2 0h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
        </svg>
      </button>
    </div>
  );
};

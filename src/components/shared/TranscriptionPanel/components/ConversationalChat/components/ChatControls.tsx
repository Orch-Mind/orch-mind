// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { ChatControlsProps } from "../types/ChatTypes";

/**
 * Chat controls component with modern futuristic icons
 * Enhanced with better visual feedback and animations
 */
export const ChatControls: React.FC<ChatControlsProps> = ({
  // TODO: Funcionalidade futura - Microphone props (voice input in chat)
  // microphoneState,
  // onToggleRecording,
  onSend,
  onToggleContext,
  canSend,
  showContext,
  webSearchEnabled = false,
  onToggleWebSearch,
  // TODO: Re-enable for future versions - Audio Settings in chat input
  // onToggleAudioSettings,
  // showAudioSettings,
  // audioSettingsButtonRef,
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

      {/* Web Search Toggle Button */}
      <button
        className={`control-btn web-search-btn ${
          webSearchEnabled ? "active" : ""
        }`}
        onClick={onToggleWebSearch}
        title={webSearchEnabled ? "Disable web search" : "Enable web search"}
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          {/* Main globe outline */}
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity="0.9"
          />

          {/* Equator line */}
          <path
            d="M3 12h18"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.8"
          />

          {/* Northern hemisphere latitude */}
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4.5"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
            transform="rotate(-15 12 12)"
          />

          {/* Southern hemisphere latitude */}
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4.5"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
            transform="rotate(15 12 12)"
          />

          {/* Prime meridian */}
          <ellipse
            cx="12"
            cy="12"
            rx="4.5"
            ry="9"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            opacity="0.7"
          />

          {/* Secondary meridian */}
          <ellipse
            cx="12"
            cy="12"
            rx="7"
            ry="9"
            stroke="currentColor"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />

          {/* Continents representation - simplified landmasses */}
          <path
            d="M8 7c1.5-0.5 3 0.5 4.5 0.2c1-0.2 2 0.3 2.5 1.3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M6.5 14c2-0.8 3.5 0.2 5 0c1.5-0.2 3 0.5 4 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M10 16.5c1.2-0.3 2.5 0.2 3.5 0.8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />

          {/* Search indicator - modern cursor/pointer */}
          <path
            d="M17 7l2-2M19 5l1.5 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
          <circle cx="17" cy="7" r="1" fill="currentColor" opacity="0.7" />

          {/* Active state animations */}
          {webSearchEnabled && (
            <>
              {/* Outer pulse ring */}
              <circle
                cx="12"
                cy="12"
                r="12"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
                opacity="0.3"
              >
                <animate
                  attributeName="r"
                  values="9;12;9"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0.1;0.3"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Inner pulse ring */}
              <circle
                cx="12"
                cy="12"
                r="10.5"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
                opacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="9;10.5;9"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.1;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Active search beam with rotation */}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 17 7;360 17 7"
                  dur="4s"
                  repeatCount="indefinite"
                />
                <path
                  d="M17 7l3-3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.9"
                />
                <circle
                  cx="17"
                  cy="7"
                  r="1.5"
                  fill="currentColor"
                  opacity="0.9"
                />
              </g>
            </>
          )}
        </svg>
      </button>

      {/* TODO: Re-enable for future versions - Audio Settings Button
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
      */}

      {/* TODO: Funcionalidade futura - Microphone Button (voice input in chat)
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
      */}

      {/* Send Button - Enhanced design */}
      <button
        className={`control-btn send-btn ${canSend ? "ready" : ""}`}
        onClick={onSend}
        disabled={!canSend}
        title="Send message"
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M2 21l21-9L2 3v7l15 2-15 2v7z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="7" cy="12" r="2" fill="currentColor" opacity="0.6" />
        </svg>
      </button>
    </div>
  );
};

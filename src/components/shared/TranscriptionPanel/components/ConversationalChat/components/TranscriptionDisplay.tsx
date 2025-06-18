import React from "react";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { TranscriptionDisplayProps } from "../types/ChatTypes";

/**
 * Transcription display component
 * Follows Single Responsibility Principle - only displays transcription
 */
export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  text,
  onClear,
  transcriptions,
}) => {
  // Auto-scroll hook - observa mudanças em transcriptions ou text
  const scrollRef = useAutoScroll<HTMLDivElement>([transcriptions, text], {
    behavior: "smooth",
  });

  // Check if we should show the component
  const hasContent = transcriptions
    ? transcriptions.some((t) => !t.sent)
    : text && text.trim().length > 0;

  // Don't render anything if there's no content
  if (!hasContent) return null;

  // If we have structured transcriptions with sent status, use that
  if (transcriptions && transcriptions.length > 0) {
    // Concatenate all pending (not sent) transcriptions into a single string
    const pendingTranscriptions = transcriptions
      .filter((t) => !t.sent)
      .map((t) => t.text)
      .join(" "); // Join with space instead of newline for continuous text

    // If no pending transcriptions, don't show the component
    if (!pendingTranscriptions) return null;

    return (
      <div className="transcription-display">
        <div className="transcription-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          Live Transcription:
        </div>
        <div
          className="transcription-text transcription-scrollable"
          ref={scrollRef}
        >
          {pendingTranscriptions}
        </div>
        <button
          className="transcription-clear-btn"
          onClick={onClear}
          title="Clear transcription"
          type="button"
        >
          ×
        </button>
      </div>
    );
  }

  // Fallback to simple text display
  return (
    <div className="transcription-display">
      <div className="transcription-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        Live Transcription:
      </div>
      <div
        className="transcription-text transcription-scrollable"
        ref={scrollRef}
      >
        {text}
      </div>
      <button
        className="transcription-clear-btn"
        onClick={onClear}
        title="Clear transcription"
        type="button"
      >
        ×
      </button>
    </div>
  );
};

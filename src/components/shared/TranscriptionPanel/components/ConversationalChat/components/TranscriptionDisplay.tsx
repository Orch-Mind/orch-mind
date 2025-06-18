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
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="currentColor"
              className="pulse-dot"
            />
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle
              cx="12"
              cy="12"
              r="11"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.3"
            />
            <path
              d="M12 3v2M12 19v2M3 12h2M19 12h2"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
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
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
            className="pulse-dot"
          />
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
          />
          <path
            d="M12 3v2M12 19v2M3 12h2M19 12h2"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.4"
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

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { CognitionEvent } from "../../../../context/deepgram/types/CognitionEvent";
import styles from "../../CognitionTimeline.module.css";
import { CognitionEventUI } from "../Event/CognitionEventUI";

/**
 * UI component for a visually grouped cognition cycle (RawPrompt → ... → GPTResponse),
 * accordion-exclusivo: só um ciclo aberto por vez, com scroll interno.
 * SOLID: Single Responsibility Principle.
 */
export interface CognitionLogGroupUIProps {
  events: CognitionEvent[]; // Events in this group, in order
  groupIdx: number;
  onEventClick?: (event: CognitionEvent) => void;
  getDuration?: (idx: number) => { value: string; color: string };
  expanded?: boolean;
  onExpand?: () => void;
}

export const CognitionLogGroupUI: React.FC<CognitionLogGroupUIProps> = ({
  events,
  groupIdx,
  onEventClick,
  getDuration,
  expanded = false,
  onExpand,
}) => {
  if (!events.length) return null;

  return (
    <div className="mt-3 mb-0">
      <button
        type="button"
        className={`w-full relative flex items-center justify-between px-5 py-2.5 rounded-2xl border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] group transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:ring-opacity-50 min-h-[48px] ${styles.groupButton}`}
        onClick={onExpand}
        aria-controls={`cognitive-group-${groupIdx}`}
        aria-label={`Cognitive Cycle ${groupIdx + 1} with ${
          events.length
        } events. Click to ${expanded ? "collapse" : "expand"}`}
      >
        {/* Left side with icon and title */}
        <div className="flex items-center gap-4">
          {/* Neural network brain icon with glow */}
          <div className="relative flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.2)]">
            <svg
              className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22 14.3529C22 19.0968 17.0751 23 10.9999 23C5.33439 23 1 19.2323 1 14.8235C1 10.9343 3.35098 8.34576 6.70584 7.21671C8.73574 6.5246 9.74705 6.17854 10.5291 5.15517C11.3112 4.13179 11.5349 2.74591 11.9823 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M16 10.5C16 8.01472 13.9853 6 11.5 6C9.01472 6 7 8.01472 7 10.5C7 12.9853 9.01472 15 11.5 15C13.9853 15 16 12.9853 16 10.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M11.5 6V4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M16 10.5H17.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M11.5 15V16.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M7 10.5H5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M14.5281 7.47192L15.5888 6.41116"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M14.5281 13.5281L15.5888 14.5888"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M8.47192 13.5281L7.41116 14.5888"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M8.47192 7.47192L7.41116 6.41116"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#121936]/90 to-cyan-950/20 rounded-full"></div>
          </div>

          {/* Title */}
          <h3 className="text-white font-bold text-xl tracking-wide select-none">
            Cognitive Cycle #{groupIdx + 1}
          </h3>
        </div>

        {/* Right side with badge and arrow */}
        <div className="flex items-center gap-3">
          {/* Event count badge matching Export buttons */}
          <div className="px-4 py-1 rounded-full bg-cyan-400 text-[#121936] text-base font-bold flex items-center justify-center min-w-[2.5rem] shadow-[0_0_5px_rgba(34,211,238,0.3)]">
            {events.length}
          </div>

          {/* Chevron that changes direction when expanded */}
          <div className="flex items-center justify-center w-6 h-6 text-cyan-400">
            <span
              className={`text-xl font-bold transition-transform duration-200 inline-block ${
                expanded ? "rotate-90" : "rotate-0"
              }`}
            >
              &gt;
            </span>
          </div>
        </div>
      </button>
      <div
        id={`cognitive-group-${groupIdx}`}
        className={`${styles.collapsibleWrapper} ${
          expanded ? styles.fadeIn : ""
        }`}
        data-expanded={expanded}
      >
        {expanded && (
          <div className={`px-2 ${styles.scrollableContent}`}>
            {events.map((event, idx) => (
              <CognitionEventUI
                key={
                  event.timestamp +
                  "-" +
                  event.type +
                  "-" +
                  groupIdx +
                  "-" +
                  idx
                }
                event={event}
                idx={idx}
                onClick={onEventClick}
                duration={getDuration ? getDuration(idx) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CognitionLogGroupUI;

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { CognitionEvent } from "../../../context/deepgram/types/CognitionEvent";
import CognitionTimeline from "../../CognitionTimeline/CognitionTimeline";

interface CognitionLogSectionProps {
  cognitionEvents: CognitionEvent[];
  exporters: { label: string }[];
  exportEvents: (label: string) => void;
  clearEvents: () => void;
}

const CognitionLogSection: React.FC<CognitionLogSectionProps> = ({
  cognitionEvents,
  exporters,
  exportEvents,
  clearEvents,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <button
          className="orchos-cognition-logs-action-btn"
          onClick={() => exportEvents("Export cognitive log (JSON)")}
          title="Export as JSON"
          style={{ flex: "1" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" stroke="#00F0FF" strokeWidth="1.5" />
            <path
              d="M10 14V9m0 0l2.5 2.5M10 9l-2.5 2.5"
              stroke="#8F00FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          JSON
        </button>
        <button
          className="orchos-cognition-logs-action-btn"
          onClick={() => exportEvents("Export cognitive log (TXT)")}
          title="Export as TXT"
          style={{ flex: "1" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" stroke="#00F0FF" strokeWidth="1.5" />
            <path
              d="M10 14V9m0 0l2.5 2.5M10 9l-2.5 2.5"
              stroke="#8F00FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          TXT
        </button>
        <button
          className="orchos-cognition-logs-action-btn"
          onClick={clearEvents}
          title="Clear all logs"
          style={{ width: "auto", padding: "0.75rem 1.5rem" }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#ff4dd2" strokeWidth="1.5" />
            <path
              d="M7 7l6 6M13 7l-6 6"
              stroke="#ff4dd2"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Clear
        </button>
      </div>

      {/* Logs list */}
      <div className="orchos-cognition-logs-list">
        <CognitionTimeline events={cognitionEvents} />
      </div>
    </div>
  );
};

export default CognitionLogSection;

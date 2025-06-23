// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useState } from "react";
import { CognitionEvent } from "../../context/deepgram/types/CognitionEvent";
import CognitionDetailModal from "./CognitionDetailModal";
import styles from "./CognitionTimeline.module.css";
import CognitionTimelineGroupedUI from "./ui/CognitionTimelineGroupedUI";

/**
 * CognitionTimeline (UI grouped version)
 * - UI/UX lendária, disruptiva e simbólica.
 * - Não altera dados, modelo ou lógica.
 * - Segue SOLID e Clean Architecture.
 */
interface CognitionTimelineProps {
  events: CognitionEvent[];
}

export const CognitionTimeline: React.FC<CognitionTimelineProps> = ({
  events,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<CognitionEvent | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Open modal with event details
  const openEventDetails = (event: CognitionEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Calculate duration between consecutive events (for UI only)
  const calcDuration =
    (events: CognitionEvent[]) =>
    (idx: number): { value: string; color: string } => {
      if (idx === 0) return { value: "-", color: "text-gray-500" };
      try {
        const current = new Date(events[idx].timestamp).getTime();
        const previous = new Date(events[idx - 1].timestamp).getTime();
        const diff = current - previous;
        let color = "text-green-400";
        if (diff > 1000) color = "text-amber-400";
        if (diff > 3000) color = "text-red-400";
        if (diff < 1000) return { value: `+${diff}ms`, color };
        return { value: `+${(diff / 1000).toFixed(2)}s`, color };
      } catch (e) {
        return { value: "-", color: "text-gray-500" };
      }
    };

  if (!events || events.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-32 rounded-lg border border-cyan-400/20 text-gray-400 italic backdrop-blur-xl ${styles.emptyStateGlass}`}
      >
        <div className="flex flex-col items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 mb-2 text-cyan-400/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-cyan-200/60">No cognitive events recorded</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* UI grouped cognition cycles */}
      <CognitionTimelineGroupedUI
        events={events}
        onEventClick={openEventDetails}
        getDuration={calcDuration(events)}
      />
      {/* Modal for event details */}
      <CognitionDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
      />
    </div>
  );
};

export default CognitionTimeline;

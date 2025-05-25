// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import CognitionTimeline from '../../CognitionTimeline/CognitionTimeline';
import { CognitionEvent } from '../../../context/deepgram/types/CognitionEvent';
import styles from '../components/TextControls.module.css';

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
  clearEvents
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Button row centralizada Vision Pro Style */}
      <div className="orchos-cognition-logs-buttons justify-center items-center gap-2 mb-2.5 flex flex-wrap w-full" style={{ position: 'relative', zIndex: 10 }}>
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-3 py-1 flex items-center justify-center mx-[0.18rem]`}
          onClick={() => exportEvents('Export cognitive log (JSON)')}
          title="Export as JSON"
          style={{ minWidth: '72px', height: '32px', fontSize: '0.92rem', fontWeight: 500 }}
        >
          <span className="align-middle">JSON</span>
        </button>
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-3 py-1 flex items-center justify-center`}
          onClick={() => exportEvents('Export cognitive log (TXT)')}
          title="Export as TXT"
          style={{ minWidth: '72px', height: '32px', fontSize: '0.92rem', fontWeight: 500 }}
        >
          <span className="align-middle">TXT</span>
        </button>
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-3 py-1 flex items-center justify-center`}
          onClick={clearEvents}
          title="Clear all logs"
          style={{ minWidth: '72px', height: '32px', fontSize: '0.92rem', fontWeight: 500 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6.5" ry="4.5" stroke="#ff4dd2" strokeWidth="1.2"/><path d="M6 6l4 4M10 6l-4 4" stroke="#ff4dd2" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span className="hidden md:inline ml-1 align-middle">Clear</span>
        </button>
      </div>
      <div className="orchos-cognition-logs-list">
        <CognitionTimeline events={cognitionEvents} />
      </div>
    </div>
  );
};

export default CognitionLogSection;

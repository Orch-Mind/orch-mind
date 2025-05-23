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
    <div className="pb-6">
      {/* Button row - padrão CollapsibleCard/TextControls */}
      <div className="flex justify-end items-center gap-3 py-2 mb-2">
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-2.5 py-1.5 flex items-center justify-center`}
          onClick={() => exportEvents('Export cognitive log (JSON)')}
          title="Export as JSON"
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><ellipse cx="8.5" cy="8.5" rx="7.5" ry="5.5" stroke="#00faff" strokeWidth="1.3"/><circle cx="8.5" cy="8.5" r="2.5" fill="#00faff" fillOpacity=".9"/></svg>
          <span className="hidden md:inline ml-1 align-middle">Export JSON</span>
        </button>
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-2.5 py-1.5 flex items-center justify-center`}
          onClick={() => exportEvents('Export cognitive log (TXT)')}
          title="Export as TXT"
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><ellipse cx="8.5" cy="8.5" rx="7.5" ry="5.5" stroke="#00faff" strokeWidth="1.3"/><circle cx="8.5" cy="8.5" r="2.5" fill="#00faff" fillOpacity=".9"/></svg>
          <span className="hidden md:inline ml-1 align-middle">Export TXT</span>
        </button>
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-2.5 py-1.5 flex items-center justify-center`}
          onClick={clearEvents}
          title="Clear all logs"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6.5" ry="4.5" stroke="#ff4dd2" strokeWidth="1.2"/><path d="M6 6l4 4M10 6l-4 4" stroke="#ff4dd2" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <span className="hidden md:inline ml-1 align-middle">Clear</span>
        </button>
      </div>
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg overflow-hidden shadow-inner border border-cyan-400/20 hover:border-cyan-400/30 shadow-[0_0_5px_rgba(34,211,238,0.1)] transition-all duration-300">
        <CognitionTimeline events={cognitionEvents} />
      </div>
    </div>
  );
};

export default CognitionLogSection;

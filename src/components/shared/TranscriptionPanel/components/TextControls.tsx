// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import styles from './TextControls.module.css';

interface TextControlsProps {
  label: string;
  onClear: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
}

const TextControls: React.FC<TextControlsProps> = ({ label, onClear, onExpand, isExpanded }) => (
  <div className="flex justify-between items-center py-1 mb-2 flex-wrap">
    <h4 className="text-sm font-medium">{label}</h4>
    <div className="flex gap-2 flex-wrap">

      {onExpand && (
        <button
          className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-2.5 py-1.5 transition-all duration-150 flex items-center justify-center group`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onExpand();
          }}
          title={isExpanded ? "Collapse" : "Expand"}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><ellipse cx="8.5" cy="8.5" rx="7.5" ry="5.5" stroke="#00faff" strokeWidth="1.3"/><path d="M5 6l3.5 3.5L12 6" stroke="#00faff" strokeWidth="1.2" fill="none"/></svg>
          <span className="hidden md:inline ml-1 align-middle">{isExpanded ? "Collapse" : "Expand"}</span>
        </button>
      )}
      <button
        className={`${styles['orchos-btn-glass']} ${styles['orchos-btn-glow']} ${styles['orchos-btn-action']} px-2.5 py-1.5 transition-all duration-150 flex items-center justify-center group`}
        onClick={onClear}
        title="Clear text"
        aria-label="Clear text"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6.5" ry="4.5" stroke="#ff4dd2" strokeWidth="1.2"/><path d="M6 6l4 4M10 6l-4 4" stroke="#ff4dd2" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <span className="hidden md:inline ml-1 align-middle">Clear</span>
      </button>
    </div>
  </div>
);

export default TextControls;

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import ReactDOM from 'react-dom';
import { DuckDBTester } from '../../../debug/DuckDBTester';

interface DebugModalProps {
  show: boolean;
  onClose: () => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl h-full max-h-[90vh] mx-4 bg-gray-800/95 backdrop-blur-lg rounded-lg border border-cyan-400/30 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/20">
          <h2 className="text-xl font-bold text-cyan-400">🧪 DuckDB Debug Console</h2>
          <button
            onClick={onClose}
            title="Close Debug Modal"
            aria-label="Close Debug Modal"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 border border-red-400/30 hover:border-red-400/70 transition-all duration-200 text-red-400 hover:text-red-300"
          >
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
              <path d="M7.5 7.5L14.5 14.5M14.5 7.5L7.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 h-full overflow-auto">
          <DuckDBTester />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DebugModal; 
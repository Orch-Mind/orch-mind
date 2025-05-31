// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';

/**
 * Neural-Symbolic Mode Toggle Component
 * Controla a seleção entre o modo básico e avançado do Orch-OS
 */
import { OrchOSMode, OrchOSModeEnum } from '../../../../../services/ModeService';

interface ModeToggleProps {
  mode: OrchOSMode;
  onChange: (mode: OrchOSMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  // Symbolic: All mode checks use enum for clarity and type safety
  const isBasic = mode === OrchOSModeEnum.BASIC;
  const isAdvanced = mode === OrchOSModeEnum.ADVANCED;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xs backdrop-blur-md bg-black/40 rounded-full p-1 flex relative overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,200,255,0.2)]">
        {/* Symbolic: Glow indicator moves according to mode */}
        <div 
          className={`absolute inset-y-1 w-1/2 rounded-full transition-transform duration-500 ease-quantum ${
            isBasic
              ? 'left-1 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 shadow-[0_0_20px_5px_rgba(56,189,248,0.35)]'
              : 'right-1 left-auto bg-gradient-to-r from-blue-500/40 to-purple-600/40 shadow-[0_0_20px_5px_rgba(147,51,234,0.35)]'
          }`}
        />
        
        {/* Symbolic: Use enum for mode selection */}
        <button 
          className={`flex-1 py-2 px-2 rounded-full z-10 transition-colors duration-300 ${
            isBasic ? 'text-white font-medium' : 'text-white/60'
          }`}
          onClick={() => onChange(OrchOSModeEnum.BASIC)}
        >
          Basic Mode
        </button>
        
        <button 
          className={`flex-1 py-2 px-2 rounded-full z-10 transition-colors duration-300 ${
            isAdvanced ? 'text-white font-medium' : 'text-white/60'
          }`}
          onClick={() => onChange(OrchOSModeEnum.ADVANCED)}
        >
          Advanced Mode
        </button>
      </div>
      
      {/* Symbolic: Mode description uses enum for clarity */}
      <p className="text-xs text-cyan-300/70 mt-2 text-center max-w-xs">
        {isBasic
          ? 'Using HuggingFace models and local database storage.' 
          : 'Using Deepgram, OpenAI and Pinecone neural infrastructure.'}
      </p>
    </div>
  );
};

export default ModeToggle;

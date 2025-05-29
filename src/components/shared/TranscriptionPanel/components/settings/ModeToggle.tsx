// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';

/**
 * Neural-Symbolic Mode Toggle Component
 * Controla a seleção entre o modo básico e avançado do Orch-OS
 */
interface ModeToggleProps {
  mode: 'basic' | 'advanced';
  onChange: (mode: 'basic' | 'advanced') => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xs backdrop-blur-md bg-black/40 rounded-full p-1 flex relative overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,200,255,0.2)]">
        {/* Glow indicator que se move conforme o modo selecionado */}
        <div 
          className={`absolute inset-y-1 w-1/2 rounded-full transition-transform duration-500 ease-quantum ${
            mode === 'basic' 
              ? 'left-1 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 shadow-[0_0_20px_5px_rgba(56,189,248,0.35)]' 
              : 'right-1 left-auto bg-gradient-to-r from-blue-500/40 to-purple-600/40 shadow-[0_0_20px_5px_rgba(147,51,234,0.35)]'
          }`}
        />
        
        <button 
          className={`flex-1 py-2 px-2 rounded-full z-10 transition-colors duration-300 ${
            mode === 'basic' ? 'text-white font-medium' : 'text-white/60'
          }`}
          onClick={() => onChange('basic')}
        >
          Basic Mode
        </button>
        
        <button 
          className={`flex-1 py-2 px-2 rounded-full z-10 transition-colors duration-300 ${
            mode === 'advanced' ? 'text-white font-medium' : 'text-white/60'
          }`}
          onClick={() => onChange('advanced')}
        >
          Advanced Mode
        </button>
      </div>
      
      {/* Descrição do modo */}
      <p className="text-xs text-cyan-300/70 mt-2 text-center max-w-xs">
        {mode === 'basic' 
          ? 'Using HuggingFace models and local database storage.' 
          : 'Using Deepgram, OpenAI and Pinecone neural infrastructure.'}
      </p>
    </div>
  );
};

export default ModeToggle;

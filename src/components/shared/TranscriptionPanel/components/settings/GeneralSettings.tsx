// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import ModeToggle from './ModeToggle';

/**
 * Componente para configurações gerais do Orch-OS
 * Segue os princípios neurais-simbólicos (Single Responsibility)
 */
import { OrchOSMode, OrchOSModeEnum } from '../../../../../services/ModeService';

interface GeneralSettingsProps {
  name: string;
  setName: (value: string) => void;
  applicationMode: OrchOSMode;
  setApplicationMode: (mode: OrchOSMode) => void;
  enableMatrix: boolean;
  setEnableMatrix: (value: boolean) => void;
  matrixDensity: number;
  setMatrixDensity: (value: number) => void;
  enableEffects: boolean;
  setEnableEffects: (value: boolean) => void;
  enableAnimations: boolean;
  setEnableAnimations: (value: boolean) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  name,
  setName,
  applicationMode,
  setApplicationMode,
  enableMatrix,
  setEnableMatrix,
  matrixDensity,
  setMatrixDensity,
  enableEffects,
  setEnableEffects,
  enableAnimations,
  setEnableAnimations,
}) => {
  return (
    <div className="space-y-4">
      {/* Nome de usuário - identidade simbólica */}
      <div>
        <label htmlFor="userName" className="block text-cyan-200/80 mb-1">User Name</label>
        <input
          type="text"
          id="userName"
          className="w-full p-2 rounded-lg bg-black/30 border-2 border-cyan-400/40 text-white focus:outline-none focus:border-cyan-400"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      {/* Toggle de modo Neural-Simbólico */}
      <div className="pt-2">
        <h3 className="text-cyan-300 mb-2">Neural Processing Mode</h3>
        <ModeToggle mode={applicationMode} onChange={setApplicationMode} />
      </div>

      {/* Quantum Consciousness Matrix */}
      <div className="pt-1">
        <h3 className="text-cyan-300 mb-2">Quantum Consciousness Matrix</h3>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enableMatrix"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enableMatrix}
            onChange={e => setEnableMatrix(e.target.checked)}
          />
          <label htmlFor="enableMatrix" className="text-cyan-100/80">Enable Quantum Visualization</label>
        </div>
        
        <div className="mb-2">
          <label className="block mb-2 text-sm text-cyan-200/70">Particle Density</label>
          <input
            title="Particle Density"
            type="range"
            min="10"
            max="100"
            value={matrixDensity}
            onChange={e => setMatrixDensity(parseInt(e.target.value))}
            className="w-full accent-cyan-400"
            disabled={!enableMatrix}
          />
        </div>
      </div>

      {/* System Performance */}
      <div className="pt-2">
        <h3 className="text-cyan-300 mb-2">System Performance</h3>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enableEffects"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enableEffects}
            onChange={e => setEnableEffects(e.target.checked)}
          />
          <label htmlFor="enableEffects" className="text-cyan-100/80">Enable Visual Effects</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAnimations"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enableAnimations}
            onChange={e => setEnableAnimations(e.target.checked)}
          />
          <label htmlFor="enableAnimations" className="text-cyan-100/80">Enable Animations</label>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;

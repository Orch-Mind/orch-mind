// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';

/**
 * Componente para configurações de interface do quantum dashboard
 * Segue os princípios SOLID e Clean Architecture do Orch-OS
 */
interface InterfaceSettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  enableNeumorphism: boolean;
  setEnableNeumorphism: (value: boolean) => void;
  enableGlassmorphism: boolean;
  setEnableGlassmorphism: (value: boolean) => void;
  panelTransparency: number;
  setPanelTransparency: (value: number) => void;
  colorTheme: string;
  setColorTheme: (value: string) => void;
}

const InterfaceSettings: React.FC<InterfaceSettingsProps> = ({
  darkMode,
  setDarkMode,
  enableNeumorphism,
  setEnableNeumorphism,
  enableGlassmorphism,
  setEnableGlassmorphism,
  panelTransparency,
  setPanelTransparency,
  colorTheme,
  setColorTheme
}) => {
  return (
    <div className="space-y-4">
      {/* Appearance */}
      <div>
        <h3 className="text-cyan-300 mb-2">Visual Appearance</h3>
        
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="darkMode"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={darkMode}
            onChange={e => setDarkMode(e.target.checked)}
          />
          <label htmlFor="darkMode" className="text-cyan-100/80">Dark Mode</label>
        </div>
        
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="enableGlassmorphism"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enableGlassmorphism}
            onChange={e => setEnableGlassmorphism(e.target.checked)}
          />
          <label htmlFor="enableGlassmorphism" className="text-cyan-100/80">Glassmorphic Effects</label>
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="enableNeumorphism"
            className="mr-2 h-5 w-5 rounded-sm accent-cyan-400 bg-black/50"
            checked={enableNeumorphism}
            onChange={e => setEnableNeumorphism(e.target.checked)}
          />
          <label htmlFor="enableNeumorphism" className="text-cyan-100/80">Neumorphic Controls</label>
        </div>
      </div>

      {/* Panel Transparency */}
      <div>
        <label className="block mb-2 text-sm text-cyan-200/70">Panel Transparency</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-cyan-400/60">Solid</span>
          <input
            title="Panel Transparency"
            type="range"
            min="0"
            max="90"
            value={panelTransparency}
            onChange={e => setPanelTransparency(parseInt(e.target.value))}
            className="flex-1 accent-cyan-400"
          />
          <span className="text-xs text-cyan-400/60">Clear</span>
        </div>
      </div>

      {/* Color Theme Selection */}
      <div>
        <label htmlFor="colorTheme" className="block mb-2 text-sm text-cyan-200/70">Color Theme</label>
        <select
          id="colorTheme"
          className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
          value={colorTheme}
          onChange={e => setColorTheme(e.target.value)}
          title="Select color theme"
        >
          <option value="quantum-blue">Quantum Blue (Default)</option>
          <option value="neural-purple">Neural Purple</option>
          <option value="cosmic-green">Cosmic Green</option>
          <option value="plasma-orange">Plasma Orange</option>
        </select>
      </div>
    </div>
  );
};

export default InterfaceSettings;

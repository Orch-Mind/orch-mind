// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";

interface BetaSettingsProps {
  quantumProcessing: boolean;
  setQuantumProcessing: (enabled: boolean) => void;
  quantumVisualization: boolean;
  setQuantumVisualization: (enabled: boolean) => void;
}

const BetaSettings: React.FC<BetaSettingsProps> = ({
  quantumProcessing,
  setQuantumProcessing,
  quantumVisualization,
  setQuantumVisualization,
}) => {
  return (
    <div className="space-y-3">
      {/* Header - Padrão das outras abas */}
      <div className="text-center pb-2 border-b border-cyan-400/20">
        <h2 className="text-lg font-bold text-cyan-400 mb-0.5">
          🧪 Beta Feature Center
        </h2>
      </div>

      {/* Quantum Processing Section - Compacto */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg p-3 border border-purple-400/20">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white mb-1">
              ⚛️ Quantum Processing (Orch-OS Theory)
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Experimental quantum-inspired processing for enhanced neural
              computation. Implements theoretical quantum consciousness
              principles.
            </p>
          </div>

          <div className="ml-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quantumProcessing}
                onChange={(e) => setQuantumProcessing(e.target.checked)}
                className="sr-only peer"
                aria-label="Enable Quantum Processing"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Warning Notice - Compacto */}
        <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-400/30 rounded">
          <div className="flex items-start space-x-1.5">
            <span className="text-yellow-400 text-xs">⚠️</span>
            <div className="text-[10px] text-yellow-300">
              <p className="font-medium">Experimental Feature</p>
              <p className="mt-0.5 leading-tight">
                Highly experimental - may affect system performance. Based on
                Orch-OS theoretical frameworks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quantum Visualization Section - Compacto */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-lg p-3 border border-cyan-400/20">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white mb-1">
              🌌 Quantum Visualization (Matrix)
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enables quantum consciousness matrix visualization overlay.
              Displays real-time neural signal processing patterns.
            </p>
          </div>

          <div className="ml-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quantumVisualization}
                onChange={(e) => setQuantumVisualization(e.target.checked)}
                className="sr-only peer"
                aria-label="Enable Quantum Visualization"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </div>

        {/* Info Notice - Compacto */}
        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-400/30 rounded">
          <div className="flex items-start space-x-1.5">
            <span className="text-blue-400 text-xs">ℹ️</span>
            <div className="text-[10px] text-blue-300">
              <p className="font-medium">Visual Feature</p>
              <p className="mt-0.5 leading-tight">
                Adds immersive quantum matrix effects. May increase GPU usage.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info - Compacto */}
      <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-600/30">
        <h4 className="text-xs font-medium text-gray-300 mb-1">
          🔬 About Beta Features
        </h4>
        <p className="text-[10px] text-gray-400 leading-tight">
          Beta features are experimental implementations of theoretical concepts
          in AI and consciousness research. May be unstable or change
          significantly. Not recommended for production environments.
        </p>
      </div>
    </div>
  );
};

export default BetaSettings;

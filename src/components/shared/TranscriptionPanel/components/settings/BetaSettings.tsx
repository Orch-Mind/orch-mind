// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const handleQuantumProcessingChange = (enabled: boolean) => {
    console.log("🔄 [COMPONENT] handleQuantumProcessingChange called with:", enabled);
    
    // Se desativando Orch-OS E matrix está ativada, força desabilitar matrix ANTES de atualizar processamento
    if (!enabled && quantumVisualization) {
      console.log("🔄 [COMPONENT] Force disabling matrix visualization FIRST - calling handleQuantumVisualizationChange(false)");
      handleQuantumVisualizationChange(false);
    }
    
    // Auto-save the setting immediately
    setTimeout(() => {
      if (typeof window !== "undefined" && window.electronAPI) {
        // Settings will be auto-saved by the useBetaSettings hook
        console.log(
          enabled ? t('beta.quantumProcessing.console.enabled') : t('beta.quantumProcessing.console.disabled')
        );
        setQuantumProcessing(enabled);
      }
    }, 100);
  };

  const handleQuantumVisualizationChange = (enabled: boolean) => {
    setQuantumVisualization(enabled);
    // Auto-save the setting immediately
    setTimeout(() => {
      if (typeof window !== "undefined" && window.electronAPI) {
        // Settings will be auto-saved by the useBetaSettings hook
        console.log(
          enabled ? t('beta.quantumVisualization.console.enabled') : t('beta.quantumVisualization.console.disabled')
        );
      }
    }, 100);
  };
  return (
    <div className="space-y-3">
      {/* Header - Padrão das outras abas */}
      <div className="text-center pb-2 border-b border-cyan-400/20">
        <h2 className="text-lg font-bold text-cyan-400 mb-0.5">
          {t('beta.title')}
        </h2>
      </div>

      {/* Quantum Processing Section - Compacto */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-lg p-3 border border-purple-400/20">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white mb-1">
              {t('beta.quantumProcessing.title')}
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t('beta.quantumProcessing.description')}
            </p>
          </div>

          <div className="ml-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quantumProcessing}
                onChange={(e) =>
                  handleQuantumProcessingChange(e.target.checked)
                }
                className="sr-only peer"
                aria-label={t('beta.quantumProcessing.ariaLabel')}
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
              <p className="font-medium">{t('beta.quantumProcessing.warning.title')}</p>
              <p className="mt-0.5 leading-tight">
                {t('beta.quantumProcessing.warning.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quantum Visualization Section - Only visible when Orch-OS is enabled */}
      {quantumProcessing && (
        <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-lg p-3 border border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-white mb-1">
                {t('beta.quantumVisualization.title')}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {t('beta.quantumVisualization.description')}
              </p>
            </div>

            <div className="ml-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quantumVisualization}
                  onChange={(e) =>
                    handleQuantumVisualizationChange(e.target.checked)
                  }
                  className="sr-only peer"
                  aria-label={t('beta.quantumVisualization.ariaLabel')}
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
                <p className="font-medium">{t('beta.quantumVisualization.info.title')}</p>
                <p className="mt-0.5 leading-tight">
                  {t('beta.quantumVisualization.info.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info - Compacto */}
      <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-600/30">
        <h4 className="text-xs font-medium text-gray-300 mb-1">
          {t('beta.about.title')}
        </h4>
        <p className="text-[10px] text-gray-400 leading-tight">
          {t('beta.about.description')}
        </p>
      </div>
    </div>
  );
};

export default BetaSettings;

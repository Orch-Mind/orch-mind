// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import {
  AudioSettings,
  GeneralSettings,
  RequirementsSettings,
} from "./settings";
import ApiSettings from "./settings/ApiSettings";
import SettingsFooter from "./settings/SettingsFooter";
import SettingsHeader from "./settings/SettingsHeader";
import SettingsNavigation from "./settings/SettingsNavigation";
import { SettingsModalProps } from "./settings/types";
import { useSettingsState } from "./settings/useSettingsState";

/**
 * Modal de configurações do Orch-OS
 * Refatorado seguindo os princípios neural-simbólicos:
 * - Clean Architecture (separação de responsabilidades)
 * - SOLID (componentes com responsabilidade única)
 * - KISS (simplificação da lógica)
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ show, onClose }) => {
  // Usando o hook customizado para gerenciar todo o estado
  const settings = useSettingsState(show);

  // Se não for exibido, não renderizar nada
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
      <div
        className="rounded-2xl p-6 w-full max-w-2xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
          backdropFilter: "blur(40px) saturate(1.5) brightness(1.05)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5) brightness(1.05)",
          border: "1px solid rgba(0, 250, 255, 0.15)",
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.1), 
            0 0 100px rgba(0, 250, 255, 0.05), 
            inset 0 0 60px rgba(255, 255, 255, 0.01),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        {/* Cabeçalho */}
        <SettingsHeader onClose={onClose} />

        {/* Navegação */}
        <SettingsNavigation
          activeTab={settings.activeTab}
          setActiveTab={settings.setActiveTab}
          dependenciesReady={settings.dependenciesReady}
        />

        {/* Conteúdo das abas */}
        <div className="mb-4">
          {/* General Tab */}
          {settings.activeTab === "general" && (
            <GeneralSettings
              name={settings.name}
              setName={settings.setName}
              applicationMode={settings.applicationMode}
              setApplicationMode={settings.setApplicationMode}
              enableMatrix={settings.enableMatrix}
              setEnableMatrix={settings.setEnableMatrix}
              matrixDensity={settings.matrixDensity}
              setMatrixDensity={settings.setMatrixDensity}
            />
          )}

          {/* Audio Tab */}
          {settings.activeTab === "audio" && (
            <AudioSettings
              enhancedPunctuation={settings.enhancedPunctuation}
              setEnhancedPunctuation={settings.setEnhancedPunctuation}
              speakerDiarization={settings.speakerDiarization}
              setSpeakerDiarization={settings.setSpeakerDiarization}
              audioQuality={settings.audioQuality}
              setAudioQuality={settings.setAudioQuality}
              autoGainControl={settings.autoGainControl}
              setAutoGainControl={settings.setAutoGainControl}
              noiseSuppression={settings.noiseSuppression}
              setNoiseSuppression={settings.setNoiseSuppression}
              echoCancellation={settings.echoCancellation}
              setEchoCancellation={settings.setEchoCancellation}
            />
          )}

          {/* Requirements Tab */}
          {settings.activeTab === "requirements" && (
            <RequirementsSettings
              onDependenciesReady={settings.setDependenciesReady}
            />
          )}

          {/* Advanced Tab */}
          {settings.activeTab === "advanced" && settings.dependenciesReady && (
            <ApiSettings
              applicationMode={settings.applicationMode}
              setApplicationMode={settings.setApplicationMode}
              ollamaModel={settings.ollamaModel}
              setOllamaModel={settings.setOllamaModel}
              ollamaEmbeddingModel={settings.ollamaEmbeddingModel}
              setOllamaEmbeddingModel={settings.setOllamaEmbeddingModel}
              ollamaEnabled={settings.ollamaEnabled}
              setOllamaEnabled={settings.setOllamaEnabled}
            />
          )}

          {/* Message when Advanced is blocked */}
          {settings.activeTab === "advanced" && !settings.dependenciesReady && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center max-w-md">
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-yellow-400 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-yellow-400 mb-2">
                  Requirements Needed
                </h3>
                <p className="text-yellow-300/70 text-sm mb-4">
                  Advanced features require Ollama and Docker to be installed.
                </p>
                <button
                  onClick={() => settings.setActiveTab("requirements")}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded transition-colors text-sm"
                >
                  Go to Requirements →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões de ação */}
        <SettingsFooter
          onClose={onClose}
          saveSettings={settings.saveSettings}
        />
      </div>
    </div>
  );
};

export default SettingsModal;

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { GeneralSettings } from "./settings";
import ApiSettings from "./settings/ApiSettings";
import DeploySettings from "./settings/DeploySettings";
import DownloadSettings from "./settings/DownloadSettings";
import SettingsFooter from "./settings/SettingsFooter";
import SettingsHeader from "./settings/SettingsHeader";
import SettingsNavigation from "./settings/SettingsNavigation";
import ShareSettings from "./settings/ShareSettings";
import TrainingSettings from "./settings/TrainingSettings";
import { SettingsModalProps } from "./settings/types";
import { useSettingsState } from "./settings/useSettingsState";

/**
 * Modal de configurações do Orch-OS
 * Refatorado seguindo os princípios neural-simbólicos:
 * - Clean Architecture (separação de responsabilidades)
 * - SOLID (componentes com responsabilidade única)
 * - KISS (simplificação da lógica)
 * - Language settings movidos para General Tab
 */
const SettingsModal: React.FC<SettingsModalProps & { initialTab?: string }> = ({
  show,
  onClose,
  initialTab = "general",
}) => {
  // Usando o hook customizado para gerenciar todo o estado
  const settings = useSettingsState(show, initialTab);

  // Se não for exibido, não renderizar nada
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/10 px-4">
      <div
        className="rounded-2xl p-6 w-full max-w-4xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
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
          onTabChange={settings.setActiveTab}
        />

        {/* Conteúdo das abas */}
        <div className="mb-4">
          {/* General Tab */}
          {settings.activeTab === "general" && (
            <GeneralSettings
              name={settings.name}
              setName={settings.setName}
              enableMatrix={settings.enableMatrix}
              setEnableMatrix={settings.setEnableMatrix}
              matrixDensity={settings.matrixDensity}
              setMatrixDensity={settings.setMatrixDensity}
              language={settings.language}
              setLanguage={settings.setLanguage}
            />
          )}

          {/* Advanced Tab */}
          {settings.activeTab === "advanced" && (
            <ApiSettings
              ollamaModel={settings.ollamaModel}
              setOllamaModel={settings.setOllamaModel}
              ollamaEmbeddingModel={settings.ollamaEmbeddingModel}
              setOllamaEmbeddingModel={settings.setOllamaEmbeddingModel}
              ollamaEnabled={settings.ollamaEnabled}
              setOllamaEnabled={settings.setOllamaEnabled}
            />
          )}

          {/* Training Tab */}
          {settings.activeTab === "training" && <TrainingSettings />}

          {/* Share Tab */}
          {settings.activeTab === "share" && <ShareSettings />}

          {/* Download Tab */}
          {settings.activeTab === "download" && <DownloadSettings />}

          {/* Deploy Tab */}
          {settings.activeTab === "deploy" && <DeploySettings />}
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

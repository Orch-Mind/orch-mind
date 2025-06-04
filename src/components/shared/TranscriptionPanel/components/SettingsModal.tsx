// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useSettingsState } from './settings/useSettingsState';
import { SettingsModalProps } from './settings/types';
import ApiSettings from './settings/ApiSettings';
import {
  AudioSettings,
  GeneralSettings,
  InterfaceSettings
} from './settings';
import SettingsHeader from './settings/SettingsHeader';
import SettingsNavigation from './settings/SettingsNavigation';
import SettingsFooter from './settings/SettingsFooter';

/**
 * Modal de configurações do Orch-OS
 * Refatorado seguindo os princípios neural-simbólicos:
 * - Clean Architecture (separação de responsabilidades)
 * - SOLID (componentes com responsabilidade única)
 * - KISS (simplificação da lógica)
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose
}) => {
  // Usando o hook customizado para gerenciar todo o estado
  const settings = useSettingsState(show);
  
  // Se não for exibido, não renderizar nada
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900/90 rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative backdrop-blur-lg ring-2 ring-cyan-400/10">
        {/* Cabeçalho */}
        <SettingsHeader onClose={onClose} />
        
        {/* Navegação */}
        <SettingsNavigation 
          activeTab={settings.activeTab} 
          setActiveTab={settings.setActiveTab} 
        />
        
        {/* Conteúdo das abas */}
        <div className="mb-4">
          {/* General Tab */}
          {settings.activeTab === 'general' && (
            <GeneralSettings
              name={settings.name}
              setName={settings.setName}
              applicationMode={settings.applicationMode}
              setApplicationMode={settings.setApplicationMode}
              enableMatrix={settings.enableMatrix}
              setEnableMatrix={settings.setEnableMatrix}
              matrixDensity={settings.matrixDensity}
              setMatrixDensity={settings.setMatrixDensity}
              enableEffects={settings.enableEffects}
              setEnableEffects={settings.setEnableEffects}
              enableAnimations={settings.enableAnimations}
              setEnableAnimations={settings.setEnableAnimations}
            />
          )}
          
          {/* Interface Tab */}
          {settings.activeTab === 'interface' && (
            <InterfaceSettings
              darkMode={settings.darkMode}
              setDarkMode={settings.setDarkMode}
              enableNeumorphism={settings.enableNeumorphism}
              setEnableNeumorphism={settings.setEnableNeumorphism}
              enableGlassmorphism={settings.enableGlassmorphism}
              setEnableGlassmorphism={settings.setEnableGlassmorphism}
              panelTransparency={settings.panelTransparency}
              setPanelTransparency={settings.setPanelTransparency}
              colorTheme={settings.colorTheme}
              setColorTheme={settings.setColorTheme}
            />
          )}
          
          {/* Audio Tab */}
          {settings.activeTab === 'audio' && (
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
          
          {/* Advanced Tab */}
          {settings.activeTab === 'advanced' && (
            <ApiSettings
              applicationMode={settings.applicationMode}
              setApplicationMode={settings.setApplicationMode}
              pineconeApiKey={settings.pineconeApiKey}
              setPineconeApiKey={settings.setPineconeApiKey}
              chatgptApiKey={settings.chatgptApiKey}
              setChatgptApiKey={settings.setChatgptApiKey}
              chatgptModel={settings.chatgptModel}
              setChatgptModel={settings.setChatgptModel}
              openaiEmbeddingModel={settings.openaiEmbeddingModel}
              setOpenaiEmbeddingModel={settings.setOpenaiEmbeddingModel}
              hfModel={settings.hfModel}
              setHfModel={settings.setHfModel}
              hfEmbeddingModel={settings.hfEmbeddingModel}
              setHfEmbeddingModel={settings.setHfEmbeddingModel}
              deepgramApiKey={settings.deepgramApiKey}
              setDeepgramApiKey={settings.setDeepgramApiKey}
              deepgramModel={settings.deepgramModel}
              setDeepgramModel={settings.setDeepgramModel}
              deepgramLanguage={settings.deepgramLanguage}
              setDeepgramLanguage={settings.setDeepgramLanguage}
              openSection={settings.openSection}
              setOpenSection={settings.setOpenSection}
            />
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
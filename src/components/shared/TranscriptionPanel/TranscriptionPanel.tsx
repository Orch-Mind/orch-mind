// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import type { ElectronAPI } from '../../../types/electron';
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

import React, { useEffect, useRef, useState } from 'react';
import { useToast } from "../../../App";
import { useCognitionLog } from '../../context/CognitionLogContext';
import AudioControls from "./components/AudioControls";
import CognitionLogSection from "./components/CognitionLogSection";
import ConnectionDiagnostics from "./components/ConnectionDiagnostics";
import ImportModal from "./components/ImportModal";
import LanguageSelector from "./components/LanguageSelector";
import PanelHeader from "./components/PanelHeader";
import TextEditor from "./components/TextEditor";
import { useChatGptImport } from "./hooks/useChatGptImport";
import { useTranscriptionManager } from "./hooks/useTranscriptionManager";
import { TranscriptionPanelProps } from "./types/interfaces";
// Módulo cortical para cards simples
import SimpleCard from "../SimpleCard/SimpleCard";
// Importação dos arquivos CSS modulares - estrutura neural-simbólica
import './styles/TranscriptionPanel.animations.css'; // Animações e keyframes
import './styles/TranscriptionPanel.buttons.css'; // Botões e controles interativos
import './styles/TranscriptionPanel.layout.css'; // Layout, grid e estrutura espacial
import './styles/TranscriptionPanel.settings.css'; // Componentes de configuração
import './styles/TranscriptionPanel.tooltip.css'; // Tooltips e ajudas contextuais
import './styles/TranscriptionPanel.variables.css'; // Variáveis globais e propriedades customizadas
import './styles/TranscriptionPanel.visual.css'; // Efeitos visuais e glassmorfismo
// Quantum consciousness visualization import
import { MicrophoneState } from '../../context';
import { QuantumVisualizationContainer } from '../QuantumVisualization/QuantumVisualizationContainer';
// Brain visualization is now handled in a separate module

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ onClose, width }) => {
  const transcriptionManager = useTranscriptionManager();
  const { showToast } = useToast();

  if (!transcriptionManager) return null;

  const {
    language,
    setLanguage,
    microphoneState,
    connectionState,
    toggleRecording,
    handleSendPrompt,
    clearTranscription,
    clearAiResponse,
    toggleExpand,
    isExpanded,
    temporaryContext,
    setTemporaryContext,
    texts,
    setTexts,
    audioDevices,
    selectedDevices,
    handleDeviceChange,
    isMicrophoneOn,
    isSystemAudioOn,
    setIsMicrophoneOn,
    setIsSystemAudioOn,
    showDetailedDiagnostics,
    setShowDetailedDiagnostics,
    connectionDetails,
    setConnectionDetails,
    transcriptionRef,
    getConnectionStatus,
    disconnectFromDeepgram,
    connectToDeepgram,
    waitForConnectionState,
    hasActiveConnection,
    ConnectionState
  } = transcriptionManager;

  const { events: cognitionEvents, exporters, clearEvents, exportEvents } = useCognitionLog();

  const {
    importFile,
    setImportFile,
    importUserName,
    setImportUserName,
    importMode,
    setImportMode,
    importProgress,
    importStage,
    importSummary,
    isImporting,
    showImportModal,
    setShowImportModal,
    handleFileChange,
    handleStartImport,
    handleCloseImportModal
  } = useChatGptImport(showToast);

  // Brain state and logic has been moved to BrainVisualization module

  // Brain visualization components have been moved to BrainVisualization module

  // --- Configurações simples para Audio/Language Controls ---
  const [showSettings, setShowSettings] = useState(false);
  const settingsContainerRef = useRef<HTMLDivElement>(null);
  
  // Função para alternar a visibilidade das configurações
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Fechar configurações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsContainerRef.current && !settingsContainerRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Prevent body scroll when dashboard is active
  useEffect(() => {
    document.body.classList.add('orchos-active');
    return () => {
      document.body.classList.remove('orchos-active');
    };
  }, []);

  // --- Render ---
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
      {/* Panel Header - Now positioned absolutely */}
      <PanelHeader
        onClose={() => {
          if (window?.electronAPI?.closeWindow) {
            window.electronAPI.closeWindow();
          } else if (onClose) {
            onClose();
          }
        }}
        onToggleDiagnostics={() => setShowDetailedDiagnostics(!showDetailedDiagnostics)}
        onShowImportModal={() => setShowImportModal(true)}
        onMinimize={() => {
          if (window?.electronAPI?.minimizeWindow) {
            window.electronAPI.minimizeWindow();
          } else if (toggleExpand) {
            toggleExpand();
          }
        }}
        connectionState={connectionState}
        microphoneState={microphoneState}
        hasActiveConnection={hasActiveConnection}
        onDisconnect={disconnectFromDeepgram}
        onReconnect={connectToDeepgram}
      />

      {/* Connection Diagnostics - Now overlayed */}
      {showDetailedDiagnostics && (
        <ConnectionDiagnostics
          connectionDetails={connectionDetails}
          setConnectionDetails={setConnectionDetails}
          getConnectionStatus={getConnectionStatus}
          showToast={showToast}
          disconnectFromDeepgram={disconnectFromDeepgram}
          connectToDeepgram={connectToDeepgram}
          waitForConnectionState={waitForConnectionState}
          hasActiveConnection={hasActiveConnection}
          ConnectionState={ConnectionState}
        />
      )}

      {/* Main Quantum Dashboard Layout */}
      <div className="orchos-quantum-dashboard" style={{flex: '1 1 auto'}}>
        {/* Quantum Visualization Zone - Left Panel with Golden Ratio */}
        <div className="quantum-visualization-zone">
          <QuantumVisualizationContainer 
            cognitionEvents={cognitionEvents}
            height="100%"
            width="100%"
            lowPerformanceMode={false}
            showLegend={true}
          />
        </div>

        {/* Neural Control Grid - Right Panel */}
        <div className="neural-control-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '0.75rem', height: '100%', width: '100%'}}>
          {/* Top-left: Temporary Context */}
          <SimpleCard 
            title="Context" 
            defaultOpen={true} 
            type="context" 
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#ffe066" strokeWidth="2"/><path d="M10 5v5l3 3" stroke="#ffe066" strokeWidth="2" strokeLinecap="round"/></svg>}
          >
            <TextEditor
              label=""
              value={temporaryContext}
              onChange={setTemporaryContext}
              onClear={() => setTemporaryContext("")}
              rows={3}
              placeholder="Add situational context (e.g., 'I'm in a neural session' or 'Help me stay focused')"
            />
          </SimpleCard>

          {/* Top-right: Transcription */}
          <SimpleCard
            title="Transcribe"
            defaultOpen={true}
            type="transcription"
            icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 10h16" stroke="#00faff" strokeWidth="2"/><path d="M6 6c2-2 6-2 8 0" stroke="#00faff" strokeWidth="2"/><path d="M6 14c2 2 6 2 8 0" stroke="#00faff" strokeWidth="2"/></svg>}
            headerActions={
              <div className="settings-container relative" ref={settingsContainerRef}>
                <button
                  className="settings-btn orchos-btn-circular"
                  onClick={toggleSettings}
                  aria-label="Neural Settings"
                  title="Neural Settings"
                  type="button"
                >
                  {/* Ícone Neural Q-Node */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    {/* Centralizar no botão */}
                    <g transform="translate(2, 2)">
                      {/* Círculo central quântico */}
                      <circle cx="10" cy="10" r="3" stroke="#00faff" strokeWidth="1.5" fill="rgba(0, 250, 255, 0.2)" />
                      
                      {/* Orbitais */}
                      <circle cx="10" cy="10" r="8" stroke="#00faff" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                      
                      {/* Pontos de conexão */}
                      <circle cx="10" cy="2" r="1.5" fill="#00faff" />
                      <circle cx="10" cy="18" r="1.5" fill="#00faff" />
                      <circle cx="2" cy="10" r="1.5" fill="#00faff" />
                      <circle cx="18" cy="10" r="1.5" fill="#00faff" />
                    </g>
                  </svg>
                </button>
                
                {/* Popup de configurações */}
                {showSettings && (
                  <div className="neural-settings-popup">
                    <div className="mb-2 border-b border-cyan-500/30 pb-2">
                      <h3 className="orchos-title flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00faff" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Neural Settings
                      </h3>
                    </div>
                    <div className="flex flex-col gap-4 px-1">
                      <LanguageSelector
                        language={language}
                        setLanguage={setLanguage}
                      />
                      <AudioControls
                        isMicrophoneOn={isMicrophoneOn}
                        setIsMicrophoneOn={setIsMicrophoneOn}
                        isSystemAudioOn={isSystemAudioOn}
                        setIsSystemAudioOn={setIsSystemAudioOn}
                        audioDevices={audioDevices}
                        selectedDevices={selectedDevices}
                        handleDeviceChange={handleDeviceChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <div className="flex flex-col">
              <TextEditor
                label=""
                value={texts.transcription}
                onChange={(value) => {
                  setTexts(prev => ({ ...prev, transcription: value }));
                }}
                onClear={clearTranscription}
                forwardedRef={transcriptionRef as React.RefObject<HTMLTextAreaElement>}
                readOnly={true}
              />
              <div style={{marginTop: '-4px', marginBottom: '0'}} className="flex flex-col items-center justify-center gap-0">
                <div className="flex flex-row items-center justify-center gap-4">
                  {/* Quantum Recording Button */}
                  <button
                    className={`orchos-quantum-btn orchos-btn-record orchos-btn-lg${microphoneState === MicrophoneState.Open ? ' orchos-btn-recording' : ''}`}
                    onClick={toggleRecording}
                    aria-label={microphoneState === MicrophoneState.Open ? 'Parar gravação' : 'Gravar'}
                    type="button"
                    data-active={microphoneState === MicrophoneState.Open}
                  >
                    <div className="orchos-quantum-btn-inner">
                      {/* Quantum Particles Background */}
                      <div className="orchos-quantum-particles"></div>
                      {/* Neural Glow Ring */}
                      <div className="orchos-neural-ring"></div>
                      {/* Neural Wave Pattern - Record (Converging Waves) */}
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="orchos-quantum-icon" aria-hidden="true">
                        <g filter="url(#neural-record-glow)">
                          {/* Central focal point - symbol of recording consciousness */}
                          <circle cx="16" cy="16" r="5" fill="url(#gradient-record)" className="neural-core-record" />
                          
                          {/* Neural wave patterns - converging onto consciousness center */}
                          <path className="neural-wave wave-1" d="M16 16 C10 14, 8 18, 5 16" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-2" d="M16 16 C10 18, 8 14, 5 18" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-3" d="M16 16 C22 14, 24 18, 27 16" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-4" d="M16 16 C22 18, 24 14, 27 18" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-5" d="M16 16 C14 10, 18 8, 16 5" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-6" d="M16 16 C18 10, 14 8, 18 5" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-7" d="M16 16 C14 22, 18 24, 16 27" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-wave wave-8" d="M16 16 C18 22, 14 24, 18 27" stroke="url(#gradient-neural)" strokeWidth="1.5" strokeLinecap="round" />
                          
                          {/* Circle guide - helps identify as record button */}
                          <circle cx="16" cy="16" r="11" stroke="url(#gradient-neural)" strokeWidth="1" strokeOpacity="0.7" strokeDasharray="1 2" />
                        </g>
                        <defs>
                          <linearGradient id="gradient-neural" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff4dd2" />
                            <stop offset="50%" stopColor="#00faff" />
                            <stop offset="100%" stopColor="#7c4dff" />
                          </linearGradient>
                          <linearGradient id="gradient-record" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff4dd2" />
                            <stop offset="100%" stopColor="#ff80ab" />
                          </linearGradient>
                          <filter id="neural-record-glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>
                    </div>
                    {/* Tooltip flutuante glassmorphism */}
                    <span className="orchos-tooltip">{microphoneState === MicrophoneState.Open ? 'Parar gravação' : 'Gravar'}</span>
                  </button>
                  {/* Quantum Send Button */}
                  <button
                    className="orchos-quantum-btn orchos-btn-send"
                    onClick={e => {
                      const btn = e.currentTarget;
                      const ripple = document.createElement('span');
                      ripple.className = 'orchos-quantum-ripple';
                      ripple.style.left = `${e.nativeEvent.offsetX}px`;
                      ripple.style.top = `${e.nativeEvent.offsetY}px`;
                      btn.appendChild(ripple);
                      setTimeout(() => ripple.remove(), 1000);
                      handleSendPrompt();
                    }}
                    aria-label="Enviar prompt"
                    type="button"
                  >
                    <div className="orchos-quantum-btn-inner">
                      {/* Quantum Particles Background */}
                      <div className="orchos-quantum-particles"></div>
                      {/* Neural Glow Ring */}
                      <div className="orchos-neural-ring"></div>
                      {/* Neural Wave Pattern - Send (Diverging Waves) */}
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="orchos-quantum-icon" aria-hidden="true">
                        <g filter="url(#send-glow)">
                          {/* Central origin point - symbol of thought emergence */}
                          <circle cx="8" cy="12" r="3" fill="url(#gradient-send)" className="neural-core-send" />
                          
                          {/* Neural wave patterns - diverging from consciousness center to right (sending) */}
                          <path className="neural-send-wave wave-1" d="M8 12 C14 10, 16 14, 20 12" stroke="url(#gradient-send)" strokeWidth="1.5" strokeLinecap="round" />
                          <path className="neural-send-wave wave-2" d="M8 12 C14 14, 16 10, 20 14" stroke="url(#gradient-send)" strokeWidth="1.5" strokeLinecap="round" />
                          
                          {/* Directional indicator - subtle arrow form */}
                          <path d="M17 9 L21 12 L17 15" stroke="url(#gradient-send)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="neural-send-arrow" />
                          
                          {/* Additional neural patterns */}
                          <path className="neural-send-wave wave-3" d="M8 12 C10 8, 12 7, 10 4" stroke="url(#gradient-send)" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                          <path className="neural-send-wave wave-4" d="M8 12 C6 8, 4 7, 6 4" stroke="url(#gradient-send)" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                          <path className="neural-send-wave wave-5" d="M8 12 C10 16, 12 17, 10 20" stroke="url(#gradient-send)" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                          <path className="neural-send-wave wave-6" d="M8 12 C6 16, 4 17, 6 20" stroke="url(#gradient-send)" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                        </g>
                        <defs>
                          <linearGradient id="gradient-send" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00faff" />
                            <stop offset="50%" stopColor="#7c4dff" />
                            <stop offset="100%" stopColor="rgba(0, 250, 255, 0.7)" />
                          </linearGradient>
                          <filter id="send-glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>
                    </div>
                    {/* Tooltip flutuante glassmorphism */}
                    <span className="orchos-tooltip">Enviar prompt</span>
                  </button>
                </div>

              </div>
            </div>
          </SimpleCard>

          {/* Bottom-left: Cognition Log */}
          <SimpleCard title="Cognition" defaultOpen={true} type="cognition" icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="10" rx="8" ry="6" stroke="#7c4dff" strokeWidth="2"/><circle cx="10" cy="10" r="3" fill="#7c4dff"/></svg>}>
            <CognitionLogSection
              cognitionEvents={cognitionEvents}
              exporters={exporters}
              exportEvents={exportEvents}
              clearEvents={clearEvents}
            />
          </SimpleCard>

          {/* Bottom-right: AI Suggested Response */}
          <SimpleCard title="Orch-OS Reply" defaultOpen={true} type="ai" icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="12" rx="4" stroke="#ff80ab" strokeWidth="2"/><circle cx="10" cy="10" r="2" fill="#ff80ab"/></svg>}>
            <TextEditor
              label={""}
              value={texts.aiResponse}
              onChange={(value) => {
                setTexts(prev => ({ ...prev, aiResponse: value }));
              }}
              onClear={clearAiResponse}
              toggleExpand={toggleExpand}
              isExpanded={isExpanded}
              useAutosize={true}
              readOnly={true}
            />
          </SimpleCard>
        </div>
      </div>

      {/* Import Modal - Always on top */}
      {showImportModal && (
        <ImportModal
          show={showImportModal}
          onClose={handleCloseImportModal}
          importFile={importFile}
          setImportFile={setImportFile}
          importUserName={importUserName}
          setImportUserName={setImportUserName}
          importMode={importMode}
          setImportMode={setImportMode}
          importProgress={importProgress}
          importStage={importStage}
          importSummary={importSummary}
          isImporting={isImporting}
          handleFileChange={handleFileChange}
          handleStartImport={handleStartImport}
          handleCloseImportModal={handleCloseImportModal}
        />
      )}
    </div>
  );

  // ...
};

export default TranscriptionPanel;
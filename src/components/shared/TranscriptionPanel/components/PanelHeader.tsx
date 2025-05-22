// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import WifiStatusConnection from './WifiStatusConnection';
import { ConnectionState, MicrophoneState } from '../../../context';

/**
 * Interface cortical para o cabeçalho do painel de transcrição
 * Representa os controles principais de interface com usuário
 * seguindo a estética neural-simbólica do Orch-OS
 */
interface PanelHeaderProps {
  onClose: () => void;
  onToggleDiagnostics: () => void;
  onShowImportModal: () => void;
  onMinimize?: () => void;
  connectionState: ConnectionState;
  microphoneState: MicrophoneState;
  hasActiveConnection?: () => boolean;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  onClose,
  onToggleDiagnostics,
  onShowImportModal,
  onMinimize,
  connectionState,
  microphoneState,
  hasActiveConnection = () => false,
  onDisconnect,
  onReconnect
}) => {
  return (
    <div className="flex justify-between items-center mb-4 h-14 px-4">
      {/* Logo e Título */}
      <h3 className="font-bold text-xl tracking-wider flex items-center ml-2" style={{ fontFamily: 'Orbitron, Inter, sans-serif', background: 'linear-gradient(90deg, #00F0FF, #8F00FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 15px rgba(0,240,255,0.3)' }}>
        <span className="mr-2" style={{ fontSize: '0.8em' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="#00F0FF" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="3" fill="#8F00FF" />
          </svg>
        </span>
        Orch-OS
      </h3>
      
      {/* Espaço flex para empurrar os elementos para a direita */}
      <div className="flex-1"></div>
      
      {/* Área de todos os controles agrupados */}
      <div className="flex items-center gap-4 mr-2">
        {/* Botão Import Neural Data */}
        <button
          title="Import Neural Data"
          onClick={onShowImportModal}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-base bg-gradient-to-r from-cyan-400 via-blue-700 to-purple-600 shadow-[0_0_24px_4px_rgba(0,240,255,0.25)] hover:shadow-cyan-400/80 hover:scale-105 transition-all duration-200 ring-2 ring-cyan-400/30 backdrop-blur text-white focus:outline-none focus:ring-4 focus:ring-cyan-400/60 h-10"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="#00F0FF" strokeWidth="1.5" />
            <path d="M10 6v5m0 0l2.5-2.5M10 11l-2.5-2.5" stroke="#8F00FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Import Neural Data
        </button>
        
        {/* Indicador WiFi */}
        <WifiStatusConnection 
          connectionState={connectionState}
          microphoneState={microphoneState}
          signalStrength={hasActiveConnection() ? 'strong' : 'none'}
          onStatusClick={onToggleDiagnostics}
          showDetailedText={false}
          onDisconnect={onDisconnect}
          onReconnect={onReconnect}
        />
        
        {/* Área dos botões de controle de janela com flexbox para alinhamento perfeito */}
        <div className="flex items-center gap-2 ml-4">
          {onMinimize && (
            <button
              title="Minimize"
              onClick={onMinimize}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-cyan-500/40 hover:border-cyan-400/70 transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#00faff" strokeWidth="1.5" strokeOpacity="0.8" />
                <rect x="6" y="10.5" width="10" height="1.5" rx="0.75" fill="#00faff" fillOpacity="0.9" />
              </svg>
            </button>
          )}
          <button
            title="Close"
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-red-500/40 hover:border-red-400/70 transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#ff4455" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d="M7.5 7.5L14.5 14.5M14.5 7.5L7.5 14.5" stroke="#ff4455" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanelHeader;

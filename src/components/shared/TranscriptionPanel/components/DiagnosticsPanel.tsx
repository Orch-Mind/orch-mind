// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import { ConnectionState, MicrophoneState } from '../../../context';
import styles from './DiagnosticsPanel.module.css';

// Mantendo o arquivo mais limpo sem os ícones

/**
 * DiagnosticsPanel - Interface cortical para monitoramento de estados neurais
 * Representa os estados de conexão dos componentes de input neural (Deepgram e Microfone)
 * seguindo a estética neural-simbólica do Orch-Mind
 */
interface DiagnosticsPanelProps {
  connectionState: ConnectionState;
  microphoneState: MicrophoneState;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  connectionState, 
  microphoneState,
  onDisconnect,
  onReconnect
}) => {
  // Determina o estado geral do sistema baseado nos estados dos componentes
  const isFullyConnected = 
    connectionState === ConnectionState.OPEN && 
    (microphoneState === MicrophoneState.Open || microphoneState === MicrophoneState.Ready);

  // Mapeia valor de enum para string legível
  const getConnectionStateText = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.OPEN:
        return 'OPEN';
      case ConnectionState.CLOSED:
        return 'CLOSED';
      case ConnectionState.CONNECTING:
        return 'CONNECTING';
      case ConnectionState.ERROR:
        return 'ERROR';
      default:
        return 'UNKNOWN';
    }
  };

  const getMicStateText = (state: MicrophoneState): string => {
    switch (state) {
      case MicrophoneState.Open:
        return 'OPEN';
      case MicrophoneState.Ready:
        return 'READY';
      case MicrophoneState.Opening:
        return 'OPENING';
      case MicrophoneState.Error:
        return 'ERROR';
      case MicrophoneState.NotSetup:
        return 'NO';
      default:
        return 'UNKNOWN';
    }
  };

  // Mapeia estado para classe CSS neural-simbólica
  const getConnectionStateClass = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.OPEN:
        return styles.statusYes;
      case ConnectionState.CLOSED:
        return styles.statusUnavailable; // Fechado deve usar o amarelo (warning)
      case ConnectionState.CONNECTING:
        return styles.statusUnavailable;
      case ConnectionState.ERROR:
        return styles.statusError;
      default:
        return styles.statusUnavailable;
    }
  };

  const getMicStateClass = (state: MicrophoneState): string => {
    switch (state) {
      case MicrophoneState.Open:
      case MicrophoneState.Ready:
        return styles.statusYes;
      case MicrophoneState.Opening:
        return styles.statusUnavailable;
      case MicrophoneState.Error:
        return styles.statusError;
      case MicrophoneState.NotSetup:
        return styles.statusNo;
      default:
        return styles.statusUnavailable;
    }
  };

  // Manipuladores de eventos para ações neurais
  const handleDisconnect = () => {
    if (onDisconnect) onDisconnect();
  };

  const handleReconnect = () => {
    if (onReconnect) onReconnect();
  };

  return (
    <div className={styles.diagnosticsPanel}>
      <h3 className={styles.panelTitle}>Connection Diagnostics</h3>
      
      <table className={styles.statusTable}>
        <tbody>
          <tr className={styles.statusRow}>
            <td className={styles.statusCell}>
              <span className={styles.statusLabel}>Conn. state:</span>
            </td>
            <td className={styles.statusCell}>
              <span className={`${styles.statusValue} ${getConnectionStateClass(connectionState)}`}>
                {getConnectionStateText(connectionState)}
              </span>
            </td>
          </tr>
          <tr className={styles.statusRow}>
            <td className={styles.statusCell}>
              <span className={styles.statusLabel}>Self state:</span>
            </td>
            <td className={styles.statusCell}>
              <span className={`${styles.statusValue} ${getConnectionStateClass(connectionState)}`}>
                {getConnectionStateText(connectionState)}
              </span>
            </td>
          </tr>
          <tr className={styles.statusRow}>
            <td className={styles.statusCell}>
              <span className={styles.statusLabel}>Conn. obj.:</span>
            </td>
            <td className={styles.statusCell}>
              <span className={`${styles.statusValue} ${styles.statusYes}`}>
                {connectionState !== ConnectionState.ERROR ? 'AVAILABLE' : 'ERROR'}
              </span>
            </td>
          </tr>
          <tr className={styles.statusRow}>
            <td className={styles.statusCell}>
              <span className={styles.statusLabel}>Mic state:</span>
            </td>
            <td className={styles.statusCell}>
              <span className={`${styles.statusValue} ${getMicStateClass(microphoneState)}`}>
                {getMicStateText(microphoneState)}
              </span>
            </td>
          </tr>
          <tr className={styles.statusRow}>
            <td className={styles.statusCell}>
              <span className={styles.statusLabel}>Conn. active:</span>
            </td>
            <td className={styles.statusCell}>
              <span className={`${styles.statusValue} ${isFullyConnected ? styles.statusYes : styles.statusNo}`}>
                {isFullyConnected ? 'YES' : 'NO ✗'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div className={styles.buttonContainer}>
        <button 
          className={`${styles.button} ${styles.disconnectButton}`}
          onClick={handleDisconnect}
        >
          Disconnect
        </button>
        <button 
          className={`${styles.button} ${styles.reconnectButton}`}
          onClick={handleReconnect}
        >
          Force Reconnect
        </button>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;

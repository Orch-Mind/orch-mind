// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ConnectionDiagnosticsProps } from '../types/interfaces';

const ConnectionDiagnostics: React.FC<ConnectionDiagnosticsProps> = ({
  connectionDetails,
  setConnectionDetails,
  getConnectionStatus,
  showToast,
  disconnectFromDeepgram,
  connectToDeepgram,
  waitForConnectionState,
  hasActiveConnection,
  ConnectionState
}) => {
  const { t } = useTranslation();
  const checkConnectionStatus = () => {
    if (getConnectionStatus) {
      const status = getConnectionStatus();
      setConnectionDetails(status);

      if (status.active) {
        showToast("Diagnostics", t('connectionDiagnostics.messages.connectionActive'), "success");
      } else if (status.hasConnectionObject && status.readyState !== 1) {
        showToast("Diagnostics", t('connectionDiagnostics.messages.connectionExists', { readyState: status.readyState }), "error");
      } else if (!status.hasConnectionObject && status.stateRef === 'OPEN') {
        showToast("Diagnostics", t('connectionDiagnostics.messages.stateInconsistent'), "error");
      } else {
        showToast("Diagnostics", t('connectionDiagnostics.messages.connectionNotActive', { state: status.stateRef }), "error");
      }
    }
  };

  const forceReconnect = async () => {
    try {
      disconnectFromDeepgram();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await connectToDeepgram();
      const connected = await waitForConnectionState(ConnectionState.OPEN, 5000);
      if (connected && hasActiveConnection()) {
        showToast("Diagnostics", t('connectionDiagnostics.messages.reconnectionSuccessful'), "success");
      } else {
        showToast("Diagnostics", t('connectionDiagnostics.messages.reconnectionFailed'), "error");
      }
    } catch (error) {
      console.error("Error forcing reconnection:", error);
      showToast("Diagnostics", t('connectionDiagnostics.messages.errorReconnecting'), "error");
    }
  };

  return (
    <div className="mt-4 p-3 bg-gray-800 rounded-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">{t('connectionDiagnostics.title')}</div>
        <button
          onClick={checkConnectionStatus}
          className="text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
        >
          {t('connectionDiagnostics.checkNow')}
        </button>
      </div>
      {(connectionDetails && typeof connectionDetails === "object" && connectionDetails !== null && "state" in connectionDetails) ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-2">
            <div>{t('connectionDiagnostics.currentState')}</div>
            <div className={
              typeof connectionDetails.state === 'string' && connectionDetails.state === 'OPEN' ? 'text-green-400' :
                typeof connectionDetails.state === 'string' && connectionDetails.state === 'CONNECTING' ? 'text-yellow-400' :
                  'text-red-400'
            }>
              {typeof connectionDetails.state === 'string' ? connectionDetails.state : ''}
            </div>
            <div>{t('connectionDiagnostics.stateRef')}</div>
            <div className={
              typeof connectionDetails.stateRef === 'string' && connectionDetails.stateRef === 'OPEN' ? 'text-green-400' :
                typeof connectionDetails.stateRef === 'string' && connectionDetails.stateRef === 'CONNECTING' ? 'text-yellow-400' :
                  'text-red-400'
            }>
              {typeof connectionDetails.stateRef === 'string' ? connectionDetails.stateRef : ''}
            </div>
            <div>{t('connectionDiagnostics.connectionObject')}</div>
            <div className={connectionDetails.hasConnectionObject ? 'text-green-400' : 'text-red-400'}>
              {connectionDetails.hasConnectionObject ? t('connectionDiagnostics.available') : t('connectionDiagnostics.notAvailable')}
            </div>
            <div>{t('connectionDiagnostics.webSocketReadyState')}</div>
            <div className={
              connectionDetails.readyState === 1 ? 'text-green-400' :
                connectionDetails.readyState === 0 ? 'text-yellow-400' :
                  'text-red-400'
            }>
              {connectionDetails.readyState === null ? t('connectionDiagnostics.readyStates.na') :
                connectionDetails.readyState === 0 ? t('connectionDiagnostics.readyStates.connecting') :
                  connectionDetails.readyState === 1 ? t('connectionDiagnostics.readyStates.open') :
                    connectionDetails.readyState === 2 ? t('connectionDiagnostics.readyStates.closing') :
                      connectionDetails.readyState === 3 ? t('connectionDiagnostics.readyStates.closed') : t('connectionDiagnostics.readyStates.unknown')}
            </div>
            <div>{t('connectionDiagnostics.connectionActive')}</div>
            <div className={connectionDetails.active ? 'text-green-400' : 'text-red-400'}>
              {connectionDetails.active ? t('connectionDiagnostics.yes') : t('connectionDiagnostics.no')}
            </div>
          </div>
          <div className="pt-2 flex space-x-2">
            <button
              onClick={disconnectFromDeepgram}
              className="flex-1 bg-red-700 p-2 rounded hover:bg-red-800"
            >
              {t('connectionDiagnostics.disconnect')}
            </button>
            <button
              onClick={forceReconnect}
              className="flex-1 bg-green-700 p-2 rounded hover:bg-green-800"
            >
              {t('connectionDiagnostics.forceReconnect')}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-400">{t('connectionDiagnostics.clickToView')}</div>
      )}
    </div>
  );
};

export default ConnectionDiagnostics;

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { PrivateRoomProps } from "../types";

// SRP: Componente responsável APENAS pela interface de conexão manual
// KISS: Interface simples e focada - apenas Community e Private
export const SmartConnectComponent: React.FC<
  PrivateRoomProps & {
    persistedState?: any;
    getRecentRoomCodes?: () => string[];
    reconnectToLastSession?: () => Promise<void>;
    shouldShowReconnectPanel?: () => boolean;
  }
> = ({
  onConnect,
  isLoading,
  roomCode,
  onRoomCodeChange,
  persistedState,
  getRecentRoomCodes,
  reconnectToLastSession,
  shouldShowReconnectPanel,
}) => {
  // KISS: Lógica simples de private connect
  const handlePrivateConnect = () => {
    onConnect("private", roomCode);
  };

  return (
    <div className="space-y-3">
      {/* Reconect Panel if available */}
      {shouldShowReconnectPanel && shouldShowReconnectPanel() && (
        <ReconnectPanel
          lastConnectionType={persistedState?.lastConnectionType}
          lastRoomCode={persistedState?.lastRoomCode}
          onReconnect={reconnectToLastSession!}
          isLoading={isLoading}
        />
      )}

      {/* Manual Mode Panel - Always shown */}
      <ManualModePanel
        onConnect={onConnect}
        onPrivateConnect={handlePrivateConnect}
        isLoading={isLoading}
        roomCode={roomCode}
        onRoomCodeChange={onRoomCodeChange}
        getRecentRoomCodes={getRecentRoomCodes}
      />
    </div>
  );
};

// SRP: Componente para reconectar à sessão anterior
const ReconnectPanel: React.FC<{
  lastConnectionType: string;
  lastRoomCode?: string;
  onReconnect: () => Promise<void>;
  isLoading: boolean;
}> = ({ lastConnectionType, lastRoomCode, onReconnect, isLoading }) => {
  const { t } = useTranslation();
  const getConnectionLabel = () => {
    switch (lastConnectionType) {
      case "general":
        return t('share.communityRoom');
      case "local":
        return t('share.localNetwork');
      case "private":
        return t('share.privateRoomCode', { roomCode: lastRoomCode });
      default:
        return `${lastConnectionType}`;
    }
  };

  return (
    <div className="p-2 bg-amber-500/10 rounded border border-amber-400/30">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-amber-400 font-medium text-xs">
            {t('share.previousSession')}
          </h4>
          <p className="text-[10px] text-gray-400">{getConnectionLabel()}</p>
        </div>
        <button
          onClick={onReconnect}
          disabled={isLoading}
          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-[10px] font-medium transition-colors border border-amber-400/30 disabled:opacity-50"
        >
          {isLoading ? "⏳" : t('share.reconnect')}
        </button>
      </div>
    </div>
  );
};

// SRP: Painel focado apenas no modo manual
const ManualModePanel: React.FC<{
  onConnect: (type: "general" | "local" | "private") => void;
  onPrivateConnect: () => void;
  isLoading: boolean;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  getRecentRoomCodes?: () => string[];
}> = ({
  onConnect,
  onPrivateConnect,
  isLoading,
  roomCode,
  onRoomCodeChange,
  getRecentRoomCodes,
}) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-2">
    {/* KISS: Botão direto para sala global (Community) */}
    <button
      onClick={() => onConnect("general")}
      disabled={isLoading}
      className="w-full px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium transition-colors border border-purple-400/20 disabled:opacity-50 flex flex-col items-center justify-center"
    >
      <span className="text-sm mb-1">🌍</span>
      <span>{t('share.joinGlobalCommunity')}</span>
    </button>

    {/* KISS: Input simples para room privada */}
    <PrivateRoomInput
      roomCode={roomCode}
      onRoomCodeChange={onRoomCodeChange}
      onConnect={onPrivateConnect}
      isLoading={isLoading}
      getRecentRoomCodes={getRecentRoomCodes}
    />
  </div>
  );
};

// SRP: Componente focado apenas no input de room privada
const PrivateRoomInput: React.FC<{
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  onConnect: () => void;
  isLoading: boolean;
  getRecentRoomCodes?: () => string[];
}> = ({
  roomCode,
  onRoomCodeChange,
  onConnect,
  isLoading,
  getRecentRoomCodes,
}) => {
  const { t } = useTranslation();
  // Conditional rendering: muda placeholder e botão baseado no input
  const hasCode = roomCode.trim().length > 0;
  const placeholderText = t('share.enterCodePlaceholder');
  const buttonText = hasCode ? "🔍" : "🆕";
  const buttonTitle = hasCode
    ? t('share.lookForRoom', { roomCode })
    : t('share.createNewPrivateRoom');

  // Get recent room codes
  const recentCodes = getRecentRoomCodes?.() || [];

  return (
    <div className="p-2 bg-blue-500/10 rounded border border-blue-400/20">
      {/* Recent room codes */}
      {recentCodes.length > 0 && (
        <div className="mb-2">
          <p className="text-[8px] text-gray-500 mb-1">{t('share.recentRooms')}</p>
          <div className="flex gap-1">
            {recentCodes.map((code, index) => (
              <button
                key={`${code}-${index}`}
                onClick={() => onRoomCodeChange(code)}
                className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[8px] font-medium transition-colors border border-blue-400/30"
                title={t('share.useRoomCode', { code })}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 items-stretch">
        <input
          type="text"
          value={roomCode}
          onChange={(e) => onRoomCodeChange(e.target.value)}
          placeholder={placeholderText}
          className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-blue-400/30 rounded text-white placeholder-gray-500 text-[10px] focus:outline-none focus:border-blue-400 uppercase"
          maxLength={9}
        />
        <button
          onClick={onConnect}
          disabled={isLoading}
          title={buttonTitle}
          className="flex-shrink-0 w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[10px] font-medium transition-colors border border-blue-400/30 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? "⏳" : buttonText}
        </button>
      </div>

      {/* Conditional rendering: helper text */}
      <p className="text-[8px] text-gray-500 mt-1 px-1">
        {hasCode
          ? t('share.willLookForRoom', { roomCode })
          : t('share.willCreateNewRoom')}
      </p>
    </div>
  );
};

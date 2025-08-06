// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { useTranslation } from "react-i18next";
import { AdapterListProps } from "../types";

// SRP: Componente responsável APENAS por listar adapters do usuário
// KISS: Interface simples de lista
export const AdapterListComponent: React.FC<AdapterListProps> = ({
  adapters,
  currentRoom,
  onToggleSharing,
  isSharing,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20 h-full">
      <h3 className="text-sm font-semibold text-cyan-400 mb-3">
        {t('share.yourAdapters')}
      </h3>

      {adapters.length === 0 ? (
        <EmptyAdaptersList />
      ) : (
        <AdaptersList
          adapters={adapters}
          currentRoom={currentRoom}
          onToggleSharing={onToggleSharing}
          isSharing={isSharing}
        />
      )}
    </div>
  );
};

// SRP: Componente focado apenas em mostrar estado vazio
const EmptyAdaptersList: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="text-center py-4">
      <p className="text-gray-400 text-[10px] mb-1">{t('share.noTrainedAdapters')}</p>
      <p className="text-gray-500 text-[9px]">{t('share.trainModelFirst')}</p>
    </div>
  );
};

// SRP: Componente focado apenas em renderizar lista de adapters
const AdaptersList: React.FC<AdapterListProps> = ({
  adapters,
  currentRoom,
  onToggleSharing,
  isSharing,
}) => (
  <div className="space-y-1 max-h-32 overflow-y-auto">
    {adapters.map((adapter, idx) => (
      <AdapterItem
        key={adapter.name || `adapter-${idx}`}
        adapter={adapter}
        index={idx}
        currentRoom={currentRoom}
        onToggleSharing={onToggleSharing}
        isSharing={isSharing}
      />
    ))}
  </div>
);

// SRP: Componente focado apenas em renderizar um adapter individual
const AdapterItem: React.FC<{
  adapter: AdapterListProps["adapters"][0];
  index: number;
  currentRoom: AdapterListProps["currentRoom"];
  onToggleSharing: AdapterListProps["onToggleSharing"];
  isSharing: boolean;
}> = ({ adapter, index, currentRoom, onToggleSharing, isSharing }) => {
  // KISS: Lógica simples para determinar status
  const getAdapterStatus = (): string => {
    const { t } = useTranslation();
    
    if (!adapter.shared) return t('share.private');

    switch (currentRoom?.type) {
      case "general":
        return t('share.publicInGeneral');
      case "local":
        return t('share.sharedLocally');
      case "private":
        return t('share.sharedInRoom', { roomCode: currentRoom.code });
      default:
        return t('share.shared');
    }
  };

  // KISS: Lógica simples para estilo do botão
  const getButtonStyle = (): string => {
    if (!adapter.shared) {
      return "bg-gray-500/20 text-gray-400 border-gray-400/30 hover:bg-gray-500/30";
    }

    switch (currentRoom?.type) {
      case "general":
        return "bg-purple-500/20 text-purple-400 border-purple-400/30 hover:bg-purple-500/30";
      case "local":
        return "bg-green-500/20 text-green-400 border-green-400/30 hover:bg-green-500/30";
      case "private":
        return "bg-blue-500/20 text-blue-400 border-blue-400/30 hover:bg-blue-500/30";
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-400/30 hover:bg-cyan-500/30";
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-black/20 rounded border border-slate-400/10">
      <AdapterInfo adapter={adapter} status={getAdapterStatus()} />
      <ShareToggleButton
        adapter={adapter}
        onToggle={() => onToggleSharing(index)}
        isSharing={isSharing}
        buttonStyle={getButtonStyle()}
      />
    </div>
  );
};

// SRP: Componente focado apenas em mostrar informações do adapter
const AdapterInfo: React.FC<{
  adapter: AdapterListProps["adapters"][0];
  status: string;
}> = ({ adapter, status }) => (
  <div className="flex-1 min-w-0">
    <p className="text-[10px] font-medium text-white truncate">
      {adapter.name}
    </p>
    <p className="text-[9px] text-gray-400">
      {adapter.size} • {status}
    </p>
  </div>
);

// SRP: Botão focado apenas em toggle de compartilhamento
const ShareToggleButton: React.FC<{
  adapter: AdapterListProps["adapters"][0];
  onToggle: () => void;
  isSharing: boolean;
  buttonStyle: string;
}> = ({ adapter, onToggle, isSharing, buttonStyle }) => {
  const { t } = useTranslation();
  
  return (
    <button
      onClick={onToggle}
      disabled={!isSharing}
      className={`ml-2 px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${buttonStyle} disabled:opacity-50`}
    >
      {adapter.shared ? t('share.public') : t('share.private')}
    </button>
  );
};

// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { AvailableAdaptersProps } from "../types";

// SRP: Componente responsável APENAS por mostrar adapters disponíveis para download
// KISS: Interface simples de lista de downloads
export const AvailableAdaptersComponent: React.FC<AvailableAdaptersProps> = ({
  adapters,
  currentRoom,
  onDownload,
  isSharing,
}) => {
  return (
    <div className="bg-black/20 backdrop-blur-sm rounded-md p-3 border border-cyan-400/20 h-full">
      <h3 className="text-sm font-semibold text-cyan-400 mb-3">🎁 Available</h3>

      <AvailableAdaptersContent
        adapters={adapters}
        currentRoom={currentRoom}
        onDownload={onDownload}
        isSharing={isSharing}
      />
    </div>
  );
};

// SRP: Componente focado apenas no conteúdo baseado no estado
const AvailableAdaptersContent: React.FC<AvailableAdaptersProps> = ({
  adapters,
  currentRoom,
  onDownload,
  isSharing,
}) => {
  if (!isSharing) {
    return <NotConnectedState />;
  }

  if (adapters.length === 0) {
    return <NoAdaptersState currentRoom={currentRoom} />;
  }

  return <AdaptersList adapters={adapters} onDownload={onDownload} />;
};

// SRP: Estado quando não está conectado
const NotConnectedState: React.FC = () => (
  <div className="text-center py-4">
    <p className="text-gray-400 text-[10px] mb-1">Connect to see adapters</p>
    <p className="text-gray-500 text-[9px]">Start sharing first</p>
  </div>
);

// SRP: Estado quando não há adapters disponíveis
const NoAdaptersState: React.FC<{
  currentRoom: AvailableAdaptersProps["currentRoom"];
}> = ({ currentRoom }) => {
  // KISS: Mensagem simples baseada no tipo de room
  const getMessage = (): string => {
    switch (currentRoom?.type) {
      case "local":
        return "Check local network";
      case "general":
        return "Wait for community shares";
      case "private":
        return "Share room code";
      default:
        return "No peers connected";
    }
  };

  return (
    <div className="text-center py-4">
      <p className="text-gray-400 text-[10px] mb-1">No adapters yet</p>
      <p className="text-gray-500 text-[9px]">{getMessage()}</p>
    </div>
  );
};

// SRP: Lista dos adapters disponíveis
const AdaptersList: React.FC<{
  adapters: AvailableAdaptersProps["adapters"];
  onDownload: AvailableAdaptersProps["onDownload"];
}> = ({ adapters, onDownload }) => (
  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
    {adapters.map((adapter, index) => (
      <AvailableAdapterItem
        key={`${adapter.topic}-${adapter.from}-${index}`}
        adapter={adapter}
        onDownload={onDownload}
      />
    ))}
  </div>
);

// SRP: Item individual de adapter disponível
const AvailableAdapterItem: React.FC<{
  adapter: AvailableAdaptersProps["adapters"][0];
  onDownload: AvailableAdaptersProps["onDownload"];
}> = ({ adapter, onDownload }) => (
  <div className="flex items-center justify-between p-2 bg-black/50 rounded border border-cyan-400/10">
    <AdapterInfo adapter={adapter} />
    <DownloadButton adapter={adapter} onDownload={onDownload} />
  </div>
);

// SRP: Informações do adapter disponível
const AdapterInfo: React.FC<{
  adapter: AvailableAdaptersProps["adapters"][0];
}> = ({ adapter }) => (
  <div className="flex-1 min-w-0">
    <h4 className="text-white font-medium text-xs truncate">{adapter.name}</h4>
    <p className="text-[9px] text-gray-400">
      {adapter.from} • {adapter.size}
    </p>
  </div>
);

// SRP: Botão focado apenas em download
const DownloadButton: React.FC<{
  adapter: AvailableAdaptersProps["adapters"][0];
  onDownload: AvailableAdaptersProps["onDownload"];
}> = ({ adapter, onDownload }) => (
  <button
    onClick={() => onDownload(adapter)}
    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-colors border border-green-400/30 text-[9px] font-medium"
    title={`Download ${adapter.name} from ${adapter.from}`}
  >
    📥
  </button>
);

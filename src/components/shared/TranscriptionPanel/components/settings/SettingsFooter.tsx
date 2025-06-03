// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SettingsFooterProps } from "./types";

/**
 * Componente para o rodapé do modal de configurações
 * Implementa o princípio de responsabilidade única isolando
 * a interface de ações do usuário
 */
const SettingsFooter: React.FC<SettingsFooterProps> = ({ onClose, saveSettings }) => {
  // Handler para salvar configurações e fechar
  const handleApplyChanges = () => {
    saveSettings();
    onClose();
  };
  
  return (
    <div className="flex justify-end space-x-4 mt-8">
      <button 
        className="px-6 py-2 bg-black/40 text-cyan-400/80 rounded hover:bg-black/60 hover:text-cyan-300 transition-all"
        onClick={onClose}
      >
        Cancel
      </button>
      <button 
        className="px-6 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 rounded hover:from-cyan-500/40 hover:to-blue-500/40 transition-all shadow-[0_0_10px_rgba(0,200,255,0.2)] backdrop-blur-sm"
        onClick={handleApplyChanges}
      >
        Apply Changes
      </button>
    </div>
  );
};

export default SettingsFooter;

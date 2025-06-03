// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { SettingsNavigationProps } from "./types";

/**
 * Componente para a navegação entre as abas do modal de configurações
 * Simbolicamente representa o cortex de navegação entre contextos neurais de configuração
 */
const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ 
  activeTab, 
  setActiveTab 
}) => {
  return (
    <div className="flex space-x-2 mb-6 border-b border-cyan-400/30 pb-2">
      <button 
        className={`px-4 py-2 rounded-t-lg ${activeTab === 'general' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
        onClick={() => setActiveTab('general')}
      >
        General
      </button>
      <button 
        className={`px-4 py-2 rounded-t-lg ${activeTab === 'interface' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
        onClick={() => setActiveTab('interface')}
      >
        Interface
      </button>
      <button 
        className={`px-4 py-2 rounded-t-lg ${activeTab === 'audio' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
        onClick={() => setActiveTab('audio')}
      >
        Audio
      </button>
      <button 
        className={`px-4 py-2 rounded-t-lg ${activeTab === 'advanced' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/60 hover:text-cyan-300'} transition-all duration-200`}
        onClick={() => setActiveTab('advanced')}
      >
        Advanced
      </button>
    </div>
  );
};

export default SettingsNavigation;

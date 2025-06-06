// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React, { useEffect, useState } from 'react';
import { OrchOSModeEnum } from '../../../../../../services/ModeService';
import { getOption, setOption, STORAGE_KEYS } from '../../../../../../services/StorageService';
import { HuggingFaceSettingsProps } from './types';
import { getModelDimensions } from '../../../../../../utils/EmbeddingUtils';

/**
 * Componente para configurações do modo básico
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 * Symbolic: Neurônios de interface para configuração cognitiva local
 */
export const BasicModeSettings: React.FC<HuggingFaceSettingsProps> = ({
  setApplicationMode,
  hfModel,
  setHfModel,
  hfEmbeddingModel,
  setHfEmbeddingModel,
  hfModelOptions = [],
  hfEmbeddingModelOptions = []
}) => {
  // Estado para o caminho do DuckDB
  const [duckDbPath, setDuckDbPath] = useState<string>(() => 
    getOption<string>(STORAGE_KEYS.DUCKDB_PATH) || './orch-os-memory'
  );

  // Carregar configuração salva na inicialização
  useEffect(() => {
    const savedPath = getOption<string>(STORAGE_KEYS.DUCKDB_PATH);
    if (savedPath) {
      setDuckDbPath(savedPath);
    }
  }, []);

  // Handler para seleção de diretório
  const handleBrowseDirectory = async () => {
    try {
      // Verificar se estamos no Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.selectDirectory();
        
        if (result.success && result.path) {
          const newPath = result.path;
          setDuckDbPath(newPath);
          setOption(STORAGE_KEYS.DUCKDB_PATH, newPath);
          console.log('📁 [SETTINGS] DuckDB path updated:', newPath);
          
          // Reinicializar DuckDB com o novo caminho
          try {
            const reinitResult = await (window as any).electronAPI.reinitializeDuckDB(newPath);
            if (reinitResult.success) {
              console.log('✅ [SETTINGS] DuckDB successfully reinitialized with new path');
            } else {
              console.error('❌ [SETTINGS] Failed to reinitialize DuckDB:', reinitResult.error);
            }
          } catch (reinitError) {
            console.error('❌ [SETTINGS] Error reinitializing DuckDB:', reinitError);
          }
        } else if (!result.canceled) {
          console.error('❌ [SETTINGS] Failed to select directory:', result.error);
        }
      } else {
        console.warn('⚠️ [SETTINGS] Directory selection not available in web mode');
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Error selecting directory:', error);
    }
  };

  // Handler para mudança manual do caminho
  const handlePathChange = async (newPath: string) => {
    setDuckDbPath(newPath);
    setOption(STORAGE_KEYS.DUCKDB_PATH, newPath);
    
    // Reinicializar DuckDB apenas se estamos no Electron e o caminho não está vazio
    if (typeof window !== 'undefined' && (window as any).electronAPI && newPath.trim()) {
      try {
        const reinitResult = await (window as any).electronAPI.reinitializeDuckDB(newPath);
        if (reinitResult.success) {
          console.log('✅ [SETTINGS] DuckDB successfully reinitialized with new path');
        } else {
          console.error('❌ [SETTINGS] Failed to reinitialize DuckDB:', reinitResult.error);
        }
      } catch (reinitError) {
        console.error('❌ [SETTINGS] Error reinitializing DuckDB:', reinitError);
      }
    }
  };
  return (
    <div className="p-3 rounded-lg bg-black/30 border border-cyan-500/20">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-cyan-300">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-cyan-300">Basic Mode Services</h3>
      </div>
      
      <div className="space-y-3">
        {/* Reutilizando o componente HuggingFaceSettings aqui seria mais elegante,
            mas para manter a exata aparência do componente original, mantive a implementação direta */}
        <div className="bg-black/40 p-2 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-1">Hugging Face Text Models</h4>
          <p className="text-white/70 text-sm">Select a local text-generation model for your Orch-OS instance. Only browser-compatible models are shown.</p>
          <div className="mt-2">
            <select
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              title="Select HuggingFace Model"
              aria-label="Select HuggingFace Model"
              value={hfModel}
              onChange={e => {
                setHfModel(e.target.value);
              }}
            >
              {hfModelOptions.map(model => (
                <option key={model.id} value={model.id}>{model.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="bg-black/40 p-2 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-1">Hugging Face Embedding Models <span className="text-xs text-cyan-500/70">(Basic Mode)</span></h4>
          <p className="text-white/70 text-sm">Select a local model for generating vector embeddings in the neural memory database.</p>
          <div className="mt-2">
            <select
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              title="Select HuggingFace Embedding Model"
              aria-label="Select HuggingFace Embedding Model"
              value={hfEmbeddingModel}
              onChange={e => {
                setHfEmbeddingModel(e.target.value);
              }}
            >
              {hfEmbeddingModelOptions.map(model => (
                <option key={model} value={model}>{model} ({getModelDimensions(model)}d)</option>
              ))}
            </select>
            <p className="text-xs text-cyan-400/60 mt-1">Modelo utilizado para gerar embeddings e busca semântica na memória no modo básico.</p>
          </div>
        </div>
        
        <div className="bg-black/40 p-2 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-1">Memory Storage Location</h4>
          <p className="text-white/70 text-sm">Directory where your neural memory database will be stored locally.</p>
          <div className="mt-2 flex">
            <input 
              type="text" 
              className="flex-1 p-2 rounded-l bg-black/40 text-white/90 border border-cyan-500/30"
              value={duckDbPath}
              onChange={(e) => handlePathChange(e.target.value)}
              title="Memory storage directory"
              aria-label="Memory storage directory"
              placeholder="Enter or browse for directory path"
            />
            <button 
              className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded-r px-3 border border-cyan-500/30 transition-colors"
              onClick={handleBrowseDirectory}
              title="Browse for directory"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-cyan-400/60 mt-1">DuckDB will automatically manage the vector database at this location.</p>
        </div>
      </div>
      
      <div className="mt-3 flex justify-end">
        <button 
          type="button"
          className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg py-2 mt-3 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all shadow-[0_0_10px_rgba(0,200,255,0.2)] backdrop-blur-sm"
          onClick={() => setApplicationMode && setApplicationMode(OrchOSModeEnum.ADVANCED)}
        >
          Switch to Advanced Mode
        </button>
      </div>
    </div>
  );
};

export default BasicModeSettings;


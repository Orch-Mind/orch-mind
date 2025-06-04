// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import { OrchOSModeEnum } from '../../../../../../services/ModeService';
import { HuggingFaceSettingsProps } from './types';

/**
 * Componente para configurações do modo básico
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 * Symbolic: Neurônios de interface para configuração cognitiva local
 */
interface BasicModeSettingsProps extends HuggingFaceSettingsProps {
  setApplicationMode: (mode: OrchOSModeEnum) => void;
}

export const BasicModeSettings: React.FC<BasicModeSettingsProps> = ({
  setApplicationMode,
  hfModel,
  setHfModel,
  hfEmbeddingModel,
  setHfEmbeddingModel,
  hfModelOptions = [],
  hfEmbeddingModelOptions = []
}) => {
  return (
    <div className="p-4 rounded-lg bg-black/30 border border-cyan-500/20">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500/30 to-blue-500/30 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-cyan-300">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-cyan-300">Basic Mode Services</h3>
      </div>
      
      <div className="space-y-4">
        {/* Reutilizando o componente HuggingFaceSettings aqui seria mais elegante,
            mas para manter a exata aparência do componente original, mantive a implementação direta */}
        <div className="bg-black/40 p-4 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-2">Hugging Face Text Models</h4>
          <p className="text-white/70 text-sm">Select a local text-generation model for your Orch-OS instance. Only browser-compatible models are shown.</p>
          <div className="mt-3">
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
        
        <div className="bg-black/40 p-4 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-2">Hugging Face Embedding Models <span className="text-xs text-cyan-500/70">(Basic Mode)</span></h4>
          <p className="text-white/70 text-sm">Select a local model for generating vector embeddings in the neural memory database.</p>
          <div className="mt-3">
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
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <p className="text-xs text-cyan-400/60 mt-1">Modelo utilizado para gerar embeddings e busca semântica na memória no modo básico.</p>
          </div>
        </div>
        
        <div className="bg-black/40 p-4 rounded-md">
          <h4 className="text-cyan-400 font-medium mb-2">Local Storage</h4>
          <p className="text-white/70 text-sm">Storage location for your neural memory database.</p>
          <div className="mt-3 flex">
            <input 
              type="text" 
              className="flex-1 p-2 rounded-l bg-black/40 text-white/90 border border-cyan-500/30"
              value="./orch-os-memory"
              readOnly
              title="Local storage location"
              aria-label="Local storage location"
            />
            <button className="bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-300 rounded-r px-3 border border-cyan-500/30">
              Browse
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <button 
          type="button"
          className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg py-3 mt-6 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all shadow-[0_0_10px_rgba(0,200,255,0.2)] backdrop-blur-sm"
          onClick={() => setApplicationMode(OrchOSModeEnum.ADVANCED)}
        >
          Switch to Advanced Mode
        </button>
      </div>
    </div>
  );
};

export default BasicModeSettings;

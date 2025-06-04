// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from 'react';
import { HuggingFaceSettingsProps } from './types';
import { setOption, STORAGE_KEYS } from '../../../../../../services/StorageService';
import { SUPPORTED_HF_EMBEDDING_MODELS } from '../../../../../../services/huggingface/HuggingFaceEmbeddingService';

/**
 * Componente para configuração de modelos do HuggingFace
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 */
export const HuggingFaceSettings: React.FC<HuggingFaceSettingsProps> = ({
  hfModel,
  setHfModel,
  hfEmbeddingModel,
  setHfEmbeddingModel
}) => {
  // AI model options for HuggingFace
  const HF_MODELS = [
    { id: "onnx-community/Qwen2.5-0.5B-Instruct", label: "Qwen2.5-0.5B-Instruct (Chat, fast, recommended)" },
    { id: "Xenova/phi-3-mini-4k-instruct", label: "Phi-3 Mini (Chat, experimental)" },
    { id: "Xenova/TinyLlama-1.1B-Chat-v1.0", label: "TinyLlama 1.1B (Chat, lightweight)" },
    { id: "HuggingFaceTB/SmolLM2-135M-Instruct", label: "SmolLM2-135M (Ultra lightweight, chat)" },
    { id: "Xenova/distilgpt2", label: "DistilGPT2 (Basic text generation)" }
  ];

  return (
    <div className="space-y-4">
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
              setOption(STORAGE_KEYS.HF_MODEL, e.target.value);
            }}
          >
            {HF_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
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
              setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, e.target.value);
            }}
          >
            {SUPPORTED_HF_EMBEDDING_MODELS.map(model => (
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
  );
};

export default HuggingFaceSettings;

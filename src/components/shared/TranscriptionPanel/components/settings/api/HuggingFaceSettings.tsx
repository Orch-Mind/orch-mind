// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import {
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { HuggingFaceSettingsProps } from "./types";

/**
 * Componente para configuração de modelos do HuggingFace
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 */
export const HuggingFaceSettings: React.FC<HuggingFaceSettingsProps> = ({
  hfModel,
  setHfModel,
  hfEmbeddingModel,
  setHfEmbeddingModel,
}) => {
  // AI model options for HuggingFace
  const HF_MODELS = [
    {
      id: "onnx-community/Llama-3.2-3B-Instruct-onnx-web",
      label: "Llama 3.2 3B Instruct (ONNX, recommended for web)",
    },
    {
      id: "onnx-community/Qwen3-1.7B-ONNX",
      label: "Qwen3 1.7B (ONNX, lightweight)",
    },
    {
      id: "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
      label: "DeepSeek R1 Distill Qwen 1.5B (ONNX, fast)",
    },
    {
      id: "onnx-community/Phi-3.5-mini-instruct-onnx-web",
      label: "Phi-3.5 Mini Instruct (ONNX, web optimized)",
    },
    {
      id: "onnx-community/gemma-3-1b-it-ONNX",
      label: "Gemma 3 1B Instruct (ONNX, efficient)",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-black/40 p-4 rounded-md">
        <h4 className="text-cyan-400 font-medium mb-2">
          Hugging Face Text Models
        </h4>
        <p className="text-white/70 text-sm">
          Select a local text-generation model for your Orch-OS instance. Only
          browser-compatible models are shown.
        </p>
        <div className="mt-3">
          <select
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            title="Select HuggingFace Model"
            aria-label="Select HuggingFace Model"
            value={hfModel}
            onChange={(e) => {
              setHfModel(e.target.value);
              setOption(STORAGE_KEYS.HF_MODEL, e.target.value);
            }}
          >
            {HF_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-md">
        <h4 className="text-cyan-400 font-medium mb-2">
          Hugging Face Embedding Models{" "}
          <span className="text-xs text-cyan-500/70">(Basic Mode)</span>
        </h4>
        <p className="text-white/70 text-sm">
          Select a local model for generating vector embeddings in the neural
          memory database.
        </p>
        <div className="mt-3">
          <select
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            title="Select HuggingFace Embedding Model"
            aria-label="Select HuggingFace Embedding Model"
            value={hfEmbeddingModel}
            onChange={(e) => {
              setHfEmbeddingModel(e.target.value);
              setOption(STORAGE_KEYS.HF_EMBEDDING_MODEL, e.target.value);
            }}
          >
            {HF_MODELS.map((model, i) => (
              <option key={i} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-cyan-400/60 mt-1">
            Modelo utilizado para gerar embeddings e busca semântica na memória
            no modo básico.
          </p>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-md">
        <h4 className="text-cyan-400 font-medium mb-2">Local Storage</h4>
        <p className="text-white/70 text-sm">
          Storage location for your neural memory database.
        </p>
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

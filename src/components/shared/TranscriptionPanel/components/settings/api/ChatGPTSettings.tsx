// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import { OrchOSModeEnum } from "../../../../../../services/ModeService";
import {
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { ChatGPTSettingsProps } from "./types";

// Modelos de embedding OpenAI suportados
const SUPPORTED_OPENAI_EMBEDDING_MODELS = [
  "text-embedding-ada-002",
  "text-embedding-3-small",
  "text-embedding-3-large",
];

/**
 * Componente para configuração da integração com ChatGPT/OpenAI
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 */
export const ChatGPTSettings: React.FC<ChatGPTSettingsProps> = ({
  applicationMode,
  chatgptApiKey,
  setChatgptApiKey,
  chatgptModel,
  setChatgptModel,
  openaiEmbeddingModel,
  setOpenaiEmbeddingModel,
}) => {
  return (
    <div className="p-4 rounded-md bg-black/20 mb-4 animate-fade-in">
      <h3 className="text-lg text-cyan-300 mb-4">ChatGPT Integration</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="chatgptApiKey"
            className="block mb-1 text-sm text-cyan-200/80"
          >
            ChatGPT API Key
          </label>
          <input
            type="password"
            id="chatgptApiKey"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={chatgptApiKey}
            onChange={(e) => {
              setChatgptApiKey(e.target.value);
              setOption(STORAGE_KEYS.OPENAI_API_KEY, e.target.value);
            }}
            placeholder="Enter your ChatGPT API key"
          />
        </div>

        <div>
          <label
            htmlFor="chatgptModel"
            className="block mb-1 text-sm text-cyan-200/80"
          >
            ChatGPT Model
          </label>
          <select
            id="chatgptModel"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={chatgptModel}
            onChange={(e) => {
              setChatgptModel(e.target.value);
              setOption(STORAGE_KEYS.CHATGPT_MODEL, e.target.value);
            }}
            title="Select ChatGPT Model"
          >
            {/* Modelos ChatGPT em ordem cronológica de lançamento */}
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="gpt-4.5-preview">GPT-4.5 Preview</option>
          </select>
        </div>

        {/* OpenAI Embedding Model - apenas no modo avançado */}
        {applicationMode === OrchOSModeEnum.ADVANCED && (
          <div>
            <label
              htmlFor="openaiEmbeddingModel"
              className="block mb-1 text-sm text-cyan-200/80"
            >
              OpenAI Embedding Model{" "}
              <span className="text-xs text-cyan-500/70">(Advanced Mode)</span>
            </label>
            <select
              id="openaiEmbeddingModel"
              className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
              value={openaiEmbeddingModel}
              onChange={(e) => {
                setOpenaiEmbeddingModel(e.target.value);
                setOption(STORAGE_KEYS.OPENAI_EMBEDDING_MODEL, e.target.value);
              }}
              title="Select OpenAI Embedding Model"
            >
              {SUPPORTED_OPENAI_EMBEDDING_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <p className="text-xs text-cyan-400/60 mt-1">
              Modelo utilizado para gerar embeddings e busca semântica na
              memória no modo avançado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatGPTSettings;

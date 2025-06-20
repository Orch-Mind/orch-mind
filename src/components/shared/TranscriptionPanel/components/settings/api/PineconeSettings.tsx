// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

import React from "react";
import {
  setOption,
  STORAGE_KEYS,
} from "../../../../../../services/StorageService";
import { PineconeSettingsProps } from "./types";

/**
 * Componente para configuração da integração com Pinecone Vector Database
 * Implementa princípio de Responsabilidade Única (SRP) do SOLID
 */
export const PineconeSettings: React.FC<PineconeSettingsProps> = ({
  pineconeApiKey,
  setPineconeApiKey,
}) => {
  return (
    <div className="p-4 rounded-md bg-black/20 mb-4 animate-fade-in">
      <h3 className="text-lg text-cyan-300 mb-4">Pinecone Vector Database</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="pineconeApiKey"
            className="block text-sm text-cyan-200/70 mb-1"
          >
            Pinecone API Key
          </label>
          <input
            type="password"
            id="pineconeApiKey"
            className="w-full p-2 rounded bg-black/40 text-white/90 border border-cyan-500/30"
            value={pineconeApiKey}
            onChange={(e) => {
              setPineconeApiKey(e.target.value);
              setOption(STORAGE_KEYS.PINECONE_API_KEY, e.target.value);
            }}
            placeholder="Enter your Pinecone API key"
          />
          <p className="text-xs text-cyan-400/60 mt-1">
            Used for long-term memory storage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PineconeSettings;
